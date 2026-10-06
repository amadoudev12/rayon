import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { listProducts, type ProductStatusFilter } from '@/api/endpoints';
import type { Product } from '@/api/types';
import { useAccount } from '@/auth/SessionProvider';
import { TabHeader } from '@/components/TabHeader';
import { Badge, ChipGroup, EmptyState, ErrorState, Fab, LoadingState, SearchBar } from '@/components/ui';
import { formatMoney, formatNumber } from '@/lib/format';
import { colors, font, radius, spacing } from '@/lib/theme';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const STATUS_FILTERS: { value: ProductStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'archived', label: 'Archivés' },
];

const PAGE_SIZE = 20;

export default function ProductsScreen() {
  const router = useRouter();
  const { currency, activeStoreId, activeStore, can } = useAccount();
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState<ProductStatusFilter>('all');
  const search = useDebouncedValue(searchText.trim());

  const products = useInfiniteQuery({
    queryKey: ['products', 'list', activeStoreId, search, status],
    queryFn: ({ pageParam }) => listProducts({ storeId: activeStoreId, search, status, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined,
  });

  const items = products.data?.pages.flatMap((page) => page.data) ?? [];
  const total = products.data?.pages[0]?.pagination.total;
  const isFiltered = search !== '' || status !== 'all';

  return (
    <View style={styles.root}>
      <TabHeader
        title="Produits"
        subtitle={total === undefined ? activeStore.nom : `${formatNumber(total)} produit(s) · ${activeStore.nom}`}>
        <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Nom, référence ou code-barres" />
        <ChipGroup options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </TabHeader>

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
            <ProductRow
              product={item}
              currency={currency}
              onPress={() => router.push({ pathname: '/products/[id]', params: { id: String(item.id) } })}
            />
          )}
          onEndReached={() => {
            if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={products.isRefetching && !products.isFetchingNextPage}
              onRefresh={() => void products.refetch()}
              tintColor={colors.brand600}
              colors={[colors.brand600]}
            />
          }
          ListEmptyComponent={
            isFiltered ? (
              <EmptyState icon="search-outline" title="Aucun produit trouvé" description="Essayez un autre nom ou retirez les filtres." />
            ) : (
              <EmptyState
                icon="cube-outline"
                title="Aucun produit"
                description={
                  can('product:manage')
                    ? 'Ajoutez votre premier produit pour commencer à vendre.'
                    : "Le catalogue de la boutique est vide pour l'instant."
                }
              />
            )
          }
          ListFooterComponent={
            products.isFetchingNextPage ? <ActivityIndicator color={colors.brand600} style={{ paddingVertical: spacing.lg }} /> : null
          }
        />
      )}

      {can('product:manage') && <Fab label="Produit" icon="add" bottom={spacing.lg} onPress={() => router.push('/products/new')} />}
    </View>
  );
}

function stockBadge(product: Product) {
  if (product.quantiteStock <= 0) return { tone: 'danger' as const, label: 'Rupture' };
  const label = `${formatNumber(product.quantiteStock)} ${product.unite}`;
  return { tone: product.quantiteStock <= product.seuilAlerte ? ('warning' as const) : ('success' as const), label };
}

function ProductRow({ product, currency, onPress }: { product: Product; currency: string; onPress: () => void }) {
  const stock = stockBadge(product);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.neutralBg }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, !product.actif && { color: colors.textMuted }]} numberOfLines={1}>
          {product.nom}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {product.categorie?.nom ?? 'Sans catégorie'}
          {!product.actif ? ' · Archivé' : ''}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowPrice}>{formatMoney(Number(product.prixVente), currency)}</Text>
        <Badge dot tone={stock.tone} label={stock.label} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  // Marge basse : la liste ne doit pas rester cachée sous le bouton flottant.
  list: { padding: spacing.lg, paddingBottom: 96, flexGrow: 1 },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: font.md, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: font.xs, color: colors.textMuted, marginTop: 3 },
  rowRight: { alignItems: 'flex-end', gap: 5 },
  rowPrice: { fontSize: font.md, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
});
