import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { listSales } from '@/api/endpoints';
import type { SaleSummary } from '@/api/types';
import { useAccount } from '@/auth/SessionProvider';
import { TabHeader } from '@/components/TabHeader';
import { Badge, EmptyState, ErrorState, Fab, LoadingState, SearchBar } from '@/components/ui';
import { formatDateTime, formatMoney, formatNumber, saleNumber } from '@/lib/format';
import { colors, font, radius, spacing } from '@/lib/theme';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

const PAGE_SIZE = 20;

export default function SalesScreen() {
  const router = useRouter();
  const { currency, activeStoreId, activeStore, can } = useAccount();
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText.trim());

  const sales = useInfiniteQuery({
    queryKey: ['sales', 'list', activeStoreId, search],
    queryFn: ({ pageParam }) => listSales({ storeId: activeStoreId, search, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages ? lastPage.pagination.page + 1 : undefined,
  });

  const items = sales.data?.pages.flatMap((page) => page.data) ?? [];
  const total = sales.data?.pages[0]?.pagination.total;

  return (
    <View style={styles.root}>
      <TabHeader title="Ventes" subtitle={total === undefined ? activeStore.nom : `${formatNumber(total)} vente(s) · ${activeStore.nom}`}>
        <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Rechercher par produit ou client" />
      </TabHeader>

      {sales.isPending ? (
        <LoadingState />
      ) : sales.isError ? (
        <ErrorState message={errorMessage(sales.error)} onRetry={() => void sales.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(sale) => String(sale.id)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <SaleRow
              sale={item}
              currency={currency}
              onPress={() => router.push({ pathname: '/sales/[id]', params: { id: String(item.id) } })}
            />
          )}
          onEndReached={() => {
            if (sales.hasNextPage && !sales.isFetchingNextPage) void sales.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={sales.isRefetching && !sales.isFetchingNextPage}
              onRefresh={() => void sales.refetch()}
              tintColor={colors.brand600}
              colors={[colors.brand600]}
            />
          }
          ListEmptyComponent={
            search !== '' ? (
              <EmptyState icon="search-outline" title="Aucune vente trouvée" description="Essayez un autre produit ou un autre client." />
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="Aucune vente"
                description={
                  can('sale:create')
                    ? 'Enregistrez votre première vente : elle apparaîtra ici.'
                    : "Aucune vente n'a encore été enregistrée dans cette boutique."
                }
              />
            )
          }
          ListFooterComponent={
            sales.isFetchingNextPage ? <ActivityIndicator color={colors.brand600} style={{ paddingVertical: spacing.lg }} /> : null
          }
        />
      )}

      {can('sale:create') && <Fab label="Vente" icon="add" bottom={spacing.lg} onPress={() => router.push('/sales/new')} />}
    </View>
  );
}

/** « 2 × Riz, 1 × Huile » — les deux premiers articles, puis le nombre restant. */
function describeItems(sale: SaleSummary) {
  const shown = sale.lignes.slice(0, 2).map((line) => `${line.quantite} × ${line.produit.nom}`);
  const remaining = sale.lignes.length - shown.length;
  return remaining > 0 ? `${shown.join(', ')} +${remaining}` : shown.join(', ');
}

function SaleRow({ sale, currency, onPress }: { sale: SaleSummary; currency: string; onPress: () => void }) {
  const cancelled = sale.statut === 'CANCELLED';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.neutralBg }]}>
      <View style={styles.rowText}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {sale.client?.nom ?? 'Client de passage'}
          </Text>
          {cancelled && <Badge dot tone="danger" label="Annulée" />}
        </View>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {describeItems(sale)}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {saleNumber(sale.id)} · {formatDateTime(sale.creeLe)} · {sale.vendeur.prenom}
        </Text>
      </View>
      <Text style={[styles.rowAmount, cancelled && styles.rowAmountCancelled]}>{formatMoney(Number(sale.total), currency)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  // Marge basse : la liste ne doit pas rester cachée sous le bouton flottant.
  list: { padding: spacing.lg, paddingBottom: 96, flexGrow: 1 },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { flexShrink: 1, fontSize: font.md, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: font.sm, color: colors.textSecondary },
  rowMeta: { fontSize: font.xs, color: colors.textMuted },
  rowAmount: { fontSize: font.md, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  rowAmountCancelled: { color: colors.textFaint, textDecorationLine: 'line-through' },
});
