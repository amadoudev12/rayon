import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { createCustomer, createSale, listCustomers, listProducts } from '@/api/endpoints';
import type { PaymentMethod, Product } from '@/api/types';
import { useAccount } from '@/auth/SessionProvider';
import { SelectSheet } from '@/components/SelectSheet';
import { useToast } from '@/components/Toast';
import {
  Banner,
  Button,
  Card,
  ChipGroup,
  Divider,
  EmptyState,
  ErrorState,
  Field,
  InfoRow,
  Input,
  LoadingState,
  QuantityStepper,
  SearchBar,
  SelectField,
} from '@/components/ui';
import { formatMoney, formatNumber, parseNumberInput } from '@/lib/format';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/lib/labels';
import { colors, font, radius, spacing } from '@/lib/theme';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const PAGE_SIZE = 30;

/** Ligne du panier : ce qu'il faut pour l'afficher et borner la quantité au stock connu. */
type CartLine = { productId: number; name: string; unit: string; unitPrice: number; quantity: number; maxQuantity: number };

const PAYMENT_OPTIONS = PAYMENT_METHODS.map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }));

/**
 * Enregistrement d'une vente en deux temps, pensé pour une main :
 * 1. composer le panier en touchant les produits ;
 * 2. encaisser (client, paiement, remise).
 *
 * Les montants affichés ici sont un aperçu : le serveur recalcule tout à
 * partir de ses propres prix et vérifie le stock au moment de l'encaissement.
 */
export default function NewSaleScreen() {
  const insets = useSafeAreaInsets();
  const { currency, activeStoreId, activeStore, can } = useAccount();

  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText.trim());
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const products = useInfiniteQuery({
    queryKey: ['products', 'list', activeStoreId, search, 'active', 'sale'],
    queryFn: ({ pageParam }) =>
      listProducts({ storeId: activeStoreId, search, status: 'active', page: pageParam, limit: PAGE_SIZE, sort: 'nom', order: 'asc' }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined,
  });

  if (!can('sale:create')) {
    return <ErrorState message="Votre rôle ne permet pas d'enregistrer des ventes." />;
  }

  const items = products.data?.pages.flatMap((page) => page.data) ?? [];
  const itemCount = cart.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cart.reduce((total, line) => total + line.unitPrice * line.quantity, 0);

  /** Fixe la quantité d'un produit dans le panier (0 le retire), sans dépasser le stock. */
  function setQuantity(product: Pick<CartLine, 'productId' | 'name' | 'unit' | 'unitPrice' | 'maxQuantity'>, quantity: number) {
    const bounded = Math.max(0, Math.min(quantity, product.maxQuantity));
    setCart((current) => {
      const others = current.filter((line) => line.productId !== product.productId);
      if (bounded === 0) return others;
      const existing = current.find((line) => line.productId === product.productId);
      // Une ligne existante garde sa place dans le panier.
      return existing
        ? current.map((line) => (line.productId === product.productId ? { ...line, quantity: bounded } : line))
        : [...others, { ...product, quantity: bounded }];
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchArea}>
        <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Rechercher un produit à ajouter" />
      </View>

      {products.isPending ? (
        <LoadingState />
      ) : products.isError ? (
        <ErrorState message={errorMessage(products.error)} onRetry={() => void products.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(product) => String(product.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <CatalogRow
              product={item}
              currency={currency}
              quantity={cart.find((line) => line.productId === item.id)?.quantity ?? 0}
              onChange={(quantity) =>
                setQuantity(
                  {
                    productId: item.id,
                    name: item.nom,
                    unit: item.unite,
                    unitPrice: Number(item.prixVente),
                    maxQuantity: item.quantiteStock,
                  },
                  quantity,
                )
              }
            />
          )}
          onEndReached={() => {
            if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            search !== '' ? (
              <EmptyState icon="search-outline" title="Aucun produit trouvé" description="Essayez un autre nom de produit." />
            ) : (
              <EmptyState icon="cube-outline" title="Aucun produit à vendre" description={`Le catalogue de « ${activeStore.nom} » ne contient aucun produit actif.`} />
            )
          }
          ListFooterComponent={
            products.isFetchingNextPage ? <ActivityIndicator color={colors.brand600} style={{ paddingVertical: spacing.lg }} /> : null
          }
        />
      )}

      <View style={[styles.cartBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartBarCount}>{itemCount === 0 ? 'Panier vide' : `${formatNumber(itemCount)} article(s)`}</Text>
          <Text style={styles.cartBarTotal}>{formatMoney(subtotal, currency)}</Text>
        </View>
        <Button label="Encaisser" icon="arrow-forward" disabled={cart.length === 0} onPress={() => setCheckoutOpen(true)} style={{ minWidth: 150 }} />
      </View>

      <Checkout
        visible={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        subtotal={subtotal}
        currency={currency}
        storeId={activeStoreId}
        onChangeQuantity={(line, quantity) => {
          setQuantity(line, quantity);
          // Plus rien à encaisser : retour au catalogue.
          if (quantity === 0 && cart.length === 1) setCheckoutOpen(false);
        }}
      />
    </View>
  );
}

function CatalogRow({
  product,
  currency,
  quantity,
  onChange,
}: {
  product: Product;
  currency: string;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const outOfStock = product.quantiteStock <= 0;
  const inCart = quantity > 0;

  return (
    <View style={[styles.catalogRow, inCart && styles.catalogRowSelected, outOfStock && { opacity: 0.6 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ajouter ${product.nom} au panier`}
        disabled={outOfStock || quantity >= product.quantiteStock}
        onPress={() => onChange(quantity + 1)}
        style={styles.catalogText}>
        <Text style={styles.catalogName} numberOfLines={2}>
          {product.nom}
        </Text>
        <Text style={styles.catalogMeta}>
          <Text style={styles.catalogPrice}>{formatMoney(Number(product.prixVente), currency)}</Text>
          {' · '}
          {outOfStock ? (
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Rupture</Text>
          ) : (
            `${formatNumber(product.quantiteStock)} ${product.unite} en stock`
          )}
        </Text>
      </Pressable>

      {inCart ? (
        <QuantityStepper value={quantity} max={product.quantiteStock} onChange={onChange} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ajouter ${product.nom} au panier`}
          disabled={outOfStock}
          onPress={() => onChange(1)}
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}>
          <Ionicons name="add" size={22} color={outOfStock ? colors.textFaint : colors.brand600} />
        </Pressable>
      )}
    </View>
  );
}

function Checkout({
  visible,
  onClose,
  cart,
  subtotal,
  currency,
  storeId,
  onChangeQuantity,
}: {
  visible: boolean;
  onClose: () => void;
  cart: CartLine[];
  subtotal: number;
  currency: string;
  storeId: number;
  onChangeQuantity: (line: CartLine, quantity: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { can } = useAccount();

  const [customer, setCustomer] = useState<{ id: number; nom: string } | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearchText, setCustomerSearchText] = useState('');
  const customerSearch = useDebouncedValue(customerSearchText.trim());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discountText, setDiscountText] = useState('');

  const discount = Math.max(0, parseNumberInput(discountText) ?? 0);
  const discountInvalid = discountText.trim() !== '' && (parseNumberInput(discountText) ?? -1) < 0;
  const total = Math.max(0, subtotal - discount);

  const customers = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => listCustomers({ search: customerSearch, limit: 50 }),
    enabled: customerPickerOpen,
  });

  const addCustomer = useMutation({
    mutationFn: () => createCustomer(customerSearchText.trim()),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomer({ id: created.id, nom: created.nom });
      setCustomerSearchText('');
      setCustomerPickerOpen(false);
    },
  });

  const sale = useMutation({
    mutationFn: () =>
      createSale({
        lignes: cart.map((line) => ({ produitId: line.productId, quantite: line.quantity })),
        clientId: customer?.id,
        boutiqueId: storeId,
        modePaiement: paymentMethod,
        remise: discount,
      }),
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast('Vente enregistrée');
      onClose();
      // Le reçu remplace l'écran de saisie : « retour » ne rouvre pas un panier déjà encaissé.
      router.replace({ pathname: '/sales/[id]', params: { id: String(created.id) } });
    },
    onError: () => {
      // Stock insuffisant, produit archivé entre-temps… : le catalogue affiché n'est plus à jour.
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <View style={[styles.checkoutHeader, { paddingTop: insets.top + spacing.md }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Revenir au catalogue" hitSlop={12} onPress={onClose}>
            <Ionicons name="chevron-down" size={26} color={colors.brand600} />
          </Pressable>
          <Text style={styles.checkoutTitle}>Encaissement</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.checkoutContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Panier</Text>
          <Card>
            {cart.map((line, index) => (
              <View key={line.productId}>
                {index > 0 && <Divider />}
                <View style={styles.cartLine}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catalogName} numberOfLines={2}>
                      {line.name}
                    </Text>
                    <Text style={styles.catalogMeta}>
                      {formatMoney(line.unitPrice, currency)} × {line.quantity} ={' '}
                      <Text style={styles.catalogPrice}>{formatMoney(line.unitPrice * line.quantity, currency)}</Text>
                    </Text>
                  </View>
                  <QuantityStepper value={line.quantity} max={line.maxQuantity} onChange={(quantity) => onChangeQuantity(line, quantity)} />
                </View>
              </View>
            ))}
          </Card>

          <Field label="Client (optionnel)">
            <SelectField value={customer?.nom} placeholder="Client de passage" onPress={() => setCustomerPickerOpen(true)} />
          </Field>

          <Field label="Mode de paiement">
            <ChipGroup options={PAYMENT_OPTIONS} value={paymentMethod} onChange={setPaymentMethod} wrap />
          </Field>

          <Field label={`Remise (${currency})`} error={discountInvalid ? 'La remise doit être positive ou nulle.' : undefined}>
            <Input value={discountText} onChangeText={setDiscountText} keyboardType="decimal-pad" placeholder="0" invalid={discountInvalid} />
          </Field>

          <Card style={styles.totals}>
            <InfoRow label="Sous-total" value={formatMoney(subtotal, currency)} />
            <InfoRow label="Remise" value={`-${formatMoney(discount, currency)}`} />
            <Divider />
            <InfoRow label="Total" value={formatMoney(total, currency)} strong />
          </Card>

          {sale.isError && <Banner message={errorMessage(sale.error, "Impossible d'enregistrer la vente.")} />}
        </ScrollView>

        <View style={[styles.checkoutFooter, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            label={`Encaisser ${formatMoney(total, currency)}`}
            icon="checkmark-circle"
            loading={sale.isPending}
            disabled={cart.length === 0 || discountInvalid}
            onPress={() => sale.mutate()}
          />
        </View>

        <SelectSheet<number | null>
          visible={customerPickerOpen}
          title="Client"
          options={[
            { value: null, label: 'Client de passage' },
            ...(customers.data?.data ?? []).map((item) => ({
              value: item.id as number | null,
              label: item.nom,
              description: item.telephone ?? undefined,
            })),
          ]}
          selected={customer?.id ?? null}
          onSelect={(value) => {
            const found = customers.data?.data.find((item) => item.id === value);
            setCustomer(found ? { id: found.id, nom: found.nom } : null);
          }}
          onClose={() => setCustomerPickerOpen(false)}
          emptyLabel="Aucun client"
          header={
            <>
              <View style={styles.customerSearch}>
                <View style={{ flex: 1 }}>
                  <SearchBar value={customerSearchText} onChangeText={setCustomerSearchText} placeholder="Rechercher ou nommer un client" />
                </View>
                {can('customer:manage') && (
                  <Button
                    label="Créer"
                    variant="secondary"
                    loading={addCustomer.isPending}
                    disabled={customerSearchText.trim().length < 2}
                    onPress={() => addCustomer.mutate()}
                  />
                )}
              </View>
              {addCustomer.isError && <Banner message={errorMessage(addCustomer.error)} />}
              {customers.isError && <Banner message={errorMessage(customers.error)} />}
              {customers.isPending && customerPickerOpen && <ActivityIndicator color={colors.brand600} />}
            </>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  searchArea: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  list: { padding: spacing.lg, flexGrow: 1 },

  catalogRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catalogRowSelected: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  catalogText: { flex: 1, minWidth: 0, justifyContent: 'center', minHeight: 48 },
  catalogName: { fontSize: font.md, fontWeight: '600', color: colors.text },
  catalogMeta: { fontSize: font.xs, color: colors.textMuted, marginTop: 3 },
  catalogPrice: { fontWeight: '600', color: colors.textSecondary },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cartBarCount: { fontSize: font.xs, color: colors.textMuted },
  cartBarTotal: { fontSize: font.lg, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },

  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  checkoutTitle: { fontSize: font.lg, fontWeight: '600', color: colors.text },
  checkoutContent: { padding: spacing.lg, gap: spacing.lg },
  sectionLabel: { fontSize: font.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: -spacing.sm },
  cartLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.sm },
  totals: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  checkoutFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  customerSearch: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
