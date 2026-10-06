import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, errorMessage } from '@/api/client';
import { adjustStock, getProduct } from '@/api/endpoints';
import type { ProductDetails } from '@/api/types';
import { useAccount } from '@/auth/SessionProvider';
import { useToast } from '@/components/Toast';
import { Badge, Banner, Button, Card, Divider, ErrorState, Field, InfoRow, Input, LoadingState, SectionHeader } from '@/components/ui';
import { formatDateTime, formatMoney, formatNumber, formatPercent, parseNumberInput } from '@/lib/format';
import { MOVEMENT_LABELS } from '@/lib/labels';
import { colors, font, radius, spacing } from '@/lib/theme';

export default function ProductDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const { currency, activeStoreId, activeStore, can } = useAccount();
  const [adjusting, setAdjusting] = useState(false);

  const product = useQuery({
    queryKey: ['products', 'detail', productId, activeStoreId],
    queryFn: () => getProduct(productId, activeStoreId),
    enabled: Number.isInteger(productId) && productId > 0,
  });

  if (!Number.isInteger(productId) || productId <= 0) {
    return <ErrorState message="Ce produit est introuvable." />;
  }
  if (product.isPending) return <LoadingState />;
  if (product.isError) {
    return <ErrorState message={errorMessage(product.error)} onRetry={() => void product.refetch()} />;
  }

  const data = product.data;
  const prixAchat = Number(data.prixAchat);
  const prixVente = Number(data.prixVente);
  const margeUnitaire = prixVente - prixAchat;
  const tauxMarge = prixVente > 0 ? (margeUnitaire / prixVente) * 100 : 0;
  const stock = data.quantiteStock;
  const stockTone = stock <= 0 ? 'danger' : stock <= data.seuilAlerte ? 'warning' : 'success';
  const canEdit = can('product:manage');
  const canAdjust = can('stock:adjust');

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: data.nom }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={product.isRefetching}
            onRefresh={() => void product.refetch()}
            tintColor={colors.brand600}
            colors={[colors.brand600]}
          />
        }>
        <Text style={styles.name}>{data.nom}</Text>
        <Text style={styles.category}>{data.categorie?.nom ?? 'Sans catégorie'}</Text>
        <View style={styles.badges}>
          <Badge dot tone={data.actif ? 'success' : 'neutral'} label={data.actif ? 'Actif' : 'Archivé'} />
          <Badge dot tone={stockTone} label={stock <= 0 ? 'Rupture' : `${formatNumber(stock)} ${data.unite} en stock`} />
        </View>

        <SectionHeader title="Prix" />
        <Card style={styles.cardPadded}>
          <InfoRow label="Prix de vente" value={formatMoney(prixVente, currency)} />
          <Divider />
          <InfoRow label="Prix d'achat" value={formatMoney(prixAchat, currency)} />
          <Divider />
          <InfoRow
            label="Marge unitaire"
            value={`${formatMoney(margeUnitaire, currency)} (${formatPercent(tauxMarge, { signed: false })})`}
            valueColor={margeUnitaire < 0 ? colors.danger : colors.success}
          />
        </Card>

        <SectionHeader title="Stock" />
        <Card style={styles.cardPadded}>
          <InfoRow label={`Stock · ${activeStore.nom}`} value={`${formatNumber(stock)} ${data.unite}`} />
          <Divider />
          <InfoRow label="Seuil d'alerte" value={`${formatNumber(data.seuilAlerte)} ${data.unite}`} />
          {data.stocks.length > 1 &&
            data.stocks
              .filter((row) => row.boutique.id !== activeStoreId)
              .map((row) => (
                <View key={row.boutique.id}>
                  <Divider />
                  <InfoRow label={row.boutique.nom} value={`${formatNumber(row.quantite)} ${data.unite}`} />
                </View>
              ))}
        </Card>

        <SectionHeader title="Ventes terminées" />
        <Card style={styles.cardPadded}>
          <InfoRow label="Nombre de ventes" value={formatNumber(data.ventes.nombre)} />
          <Divider />
          <InfoRow label="Quantité vendue" value={`${formatNumber(data.ventes.quantite)} ${data.unite}`} />
          <Divider />
          <InfoRow label="Montant vendu" value={formatMoney(Number(data.ventes.montant), currency)} />
        </Card>

        <SectionHeader title="Derniers mouvements de stock" />
        <Card>
          {data.mouvementsStock.length === 0 ? (
            <Text style={styles.empty}>Aucun mouvement.</Text>
          ) : (
            data.mouvementsStock.map((movement, index) => <MovementRow key={movement.id} movement={movement} first={index === 0} />)
          )}
        </Card>

        <Text style={styles.footnote}>
          Créé le {formatDateTime(data.creeLe)} · modifié le {formatDateTime(data.modifieLe)}
        </Text>
      </ScrollView>

      {(canEdit || canAdjust) && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
          {canAdjust && <Button label="Ajuster le stock" variant="secondary" onPress={() => setAdjusting(true)} style={{ flex: 1 }} />}
          {canEdit && (
            <Button
              label="Modifier"
              icon="create-outline"
              onPress={() => router.push({ pathname: '/products/[id]/edit', params: { id: String(productId) } })}
              style={{ flex: 1 }}
            />
          )}
        </View>
      )}

      <StockAdjustSheet
        visible={adjusting}
        onClose={() => setAdjusting(false)}
        productId={productId}
        productName={data.nom}
        unit={data.unite}
        currentQuantity={stock}
        storeId={activeStoreId}
        storeName={activeStore.nom}
      />
    </View>
  );
}

function MovementRow({ movement, first }: { movement: ProductDetails['mouvementsStock'][number]; first: boolean }) {
  const meta = MOVEMENT_LABELS[movement.type];
  return (
    <View>
      {!first && <Divider />}
      <View style={styles.movement}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row' }}>
            <Badge dot tone={meta.tone} label={meta.label} />
          </View>
          <Text style={styles.movementMeta} numberOfLines={1}>
            {formatDateTime(movement.creeLe)} · {movement.utilisateur.prenom} {movement.utilisateur.nom}
          </Text>
          {movement.note && (
            <Text style={styles.movementNote} numberOfLines={2}>
              {movement.note}
            </Text>
          )}
        </View>
        <Text style={[styles.movementDelta, { color: movement.variationQuantite < 0 ? colors.danger : colors.success }]}>
          {movement.variationQuantite > 0 ? '+' : ''}
          {movement.variationQuantite}
        </Text>
      </View>
    </View>
  );
}

/** Correction manuelle du stock (inventaire, casse, don…) dans la boutique active. */
function StockAdjustSheet({
  visible,
  onClose,
  productId,
  productName,
  unit,
  currentQuantity,
  storeId,
  storeName,
}: {
  visible: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  unit: string;
  currentQuantity: number;
  storeId: number;
  storeName: string;
}) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (variationQuantite: number) => adjustStock(productId, { variationQuantite, note: note.trim(), boutiqueId: storeId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast('Stock ajusté');
      close();
    },
  });

  function close() {
    setQuantity('');
    setNote('');
    setFieldError(null);
    mutation.reset();
    onClose();
  }

  function submit() {
    const value = parseNumberInput(quantity);
    if (value === null || !Number.isInteger(value) || value === 0) {
      setFieldError('Saisissez un nombre entier non nul (négatif pour retirer du stock).');
      return;
    }
    setFieldError(null);
    mutation.mutate(value);
  }

  const serverFieldError = mutation.error instanceof ApiError ? mutation.error.fieldError('variationQuantite') : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={close} accessibilityRole="button"
        accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.sheetTitle}>Ajuster le stock</Text>
          <Text style={styles.sheetSubtitle}>
            {productName} · {storeName} · stock actuel : {formatNumber(currentQuantity)} {unit}
          </Text>

          <Field label="Quantité à ajouter ou retirer" error={fieldError ?? serverFieldError} hint="Exemple : 10 pour ajouter, -3 pour retirer.">
            <Input
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numbers-and-punctuation"
              placeholder="0"
              invalid={Boolean(fieldError ?? serverFieldError)}
              autoFocus
            />
          </Field>
          <Field label="Motif (optionnel)">
            <Input value={note} onChangeText={setNote} placeholder="Inventaire, casse, don…" />
          </Field>

          {mutation.isError && !serverFieldError && <Banner message={errorMessage(mutation.error)} />}

          <View style={styles.sheetActions}>
            <Button label="Annuler" variant="secondary" onPress={close} style={{ flex: 1 }} />
            <Button label="Ajuster" loading={mutation.isPending} onPress={submit} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  name: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  category: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  cardPadded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  empty: { fontSize: font.sm, color: colors.textMuted, padding: spacing.lg },
  footnote: { fontSize: font.xs, color: colors.textFaint, marginTop: spacing.lg },

  movement: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  movementMeta: { fontSize: font.xs, color: colors.textMuted },
  movementNote: { fontSize: font.xs, color: colors.textFaint },
  movementDelta: { fontSize: font.md, fontWeight: '700', fontVariant: ['tabular-nums'] },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: {
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetTitle: { fontSize: font.lg, fontWeight: '600', color: colors.text },
  sheetSubtitle: { fontSize: font.sm, color: colors.textMuted, marginTop: -spacing.md, lineHeight: 19 },
  sheetActions: { flexDirection: 'row', gap: spacing.md },
});
