import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { getDashboard } from '@/api/endpoints';
import type { DashboardStats } from '@/api/types';
import { useAccount } from '@/auth/SessionProvider';
import { RevenueTrendChart, StatCard } from '@/components/dashboard';
import { StoreSwitcher } from '@/components/StoreSwitcher';
import { TabHeader } from '@/components/TabHeader';
import { Badge, Button, Card, Divider, EmptyState, ErrorState, LoadingState, SectionHeader } from '@/components/ui';
import { formatDateTime, formatMoney, formatMonth, formatNumber, formatPercent } from '@/lib/format';
import { colors, font, radius, spacing } from '@/lib/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile, currency, activeStoreId, can } = useAccount();

  const dashboard = useQuery({
    queryKey: ['dashboard', activeStoreId],
    queryFn: () => getDashboard(activeStoreId),
  });

  return (
    <View style={styles.root}>
      <TabHeader
        title={`Bonjour ${profile.user.prenom}`}
        subtitle={dashboard.data ? `Tableau de bord · ${formatMonth(dashboard.data.period.start)}` : 'Tableau de bord'}
        right={<StoreSwitcher />}
        stacked
      />

      {dashboard.isPending ? (
        <LoadingState label="Chargement du tableau de bord…" />
      ) : dashboard.isError ? (
        <ErrorState message={errorMessage(dashboard.error)} onRetry={() => void dashboard.refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={dashboard.isRefetching}
              onRefresh={() => void dashboard.refetch()}
              tintColor={colors.brand600}
              colors={[colors.brand600]}
            />
          }>
          <TodayCard
            stats={dashboard.data}
            currency={currency}
            onNewSale={can('sale:create') ? () => router.push('/sales/new') : undefined}
          />
          <MonthStats stats={dashboard.data} currency={currency} />

          <SectionHeader title="Chiffre d'affaires — 7 derniers jours" />
          <Card style={styles.cardPadded}>
            <RevenueTrendChart data={dashboard.data.trend} currency={currency} />
            <Text style={styles.footnote}>
              {formatMoney(
                dashboard.data.trend.reduce((total, point) => total + point.value, 0),
                currency,
              )}{' '}
              sur la période · ventes annulées exclues
            </Text>
          </Card>

          <SectionHeader title="Stock faible" />
          <Card>
            {dashboard.data.lowStock.length === 0 ? (
              <EmptyState compact icon="checkmark-circle-outline" title="Aucune alerte" description="Tous vos produits ont un stock suffisant." />
            ) : (
              dashboard.data.lowStock.map((item, index) => (
                <View key={`${item.productId}-${item.storeId}`}>
                  {index > 0 && <Divider />}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/products/[id]', params: { id: String(item.productId) } })}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.productName}
                      </Text>
                      <Text style={styles.rowSubtitle}>Seuil d&apos;alerte : {item.alertThreshold}</Text>
                    </View>
                    <Badge
                      dot
                      tone={item.quantity <= 0 ? 'danger' : 'warning'}
                      label={item.quantity <= 0 ? 'Rupture' : `${formatNumber(item.quantity)} ${item.unit}`}
                    />
                  </Pressable>
                </View>
              ))
            )}
          </Card>
          {dashboard.data.lowStockCount > dashboard.data.lowStock.length && (
            <Text style={styles.footnote}>
              {dashboard.data.lowStockCount} produits à réapprovisionner au total.
            </Text>
          )}

          <SectionHeader title="Meilleures ventes du mois" />
          <Card>
            {dashboard.data.topProducts.length === 0 ? (
              <EmptyState compact icon="receipt-outline" title="Aucune vente ce mois-ci" />
            ) : (
              dashboard.data.topProducts.map((product, index) => (
                <View key={product.productId}>
                  {index > 0 && <Divider />}
                  <View style={styles.row}>
                    <View style={styles.rank}>
                      <Text style={styles.rankLabel}>{index + 1}</Text>
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {product.productName}
                      </Text>
                      <Text style={styles.rowSubtitle}>
                        {formatNumber(product.quantity)} {product.unit} vendu(s)
                      </Text>
                    </View>
                    <Text style={styles.rowAmount}>{formatMoney(product.amount, currency)}</Text>
                  </View>
                </View>
              ))
            )}
          </Card>

          <SectionHeader
            title="Activité récente"
            action={<Button label="Voir les ventes" variant="ghost" onPress={() => router.push('/sales')} style={styles.linkButton} />}
          />
          <Card>
            {dashboard.data.recentActivity.length === 0 ? (
              <EmptyState compact icon="time-outline" title="Aucune activité récente" description="Vos ventes et dépenses apparaîtront ici." />
            ) : (
              dashboard.data.recentActivity.map((activity, index) => (
                <View key={`${activity.type}-${activity.id}`}>
                  {index > 0 && <Divider />}
                  <ActivityRow activity={activity} currency={currency} onOpenSale={(id) => router.push({ pathname: '/sales/[id]', params: { id: String(id) } })} />
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

/** Ce que le commerçant regarde en premier sur son téléphone : la journée en cours. */
function TodayCard({ stats, currency, onNewSale }: { stats: DashboardStats; currency: string; onNewSale?: () => void }) {
  return (
    <View style={styles.today}>
      <Text style={styles.todayLabel}>Encaissé aujourd&apos;hui</Text>
      <Text style={styles.todayValue} numberOfLines={1} adjustsFontSizeToFit>
        {formatMoney(stats.todayRevenue, currency)}
      </Text>
      <Text style={styles.todayHint}>{stats.todaySalesCount} vente(s) aujourd&apos;hui</Text>
      {onNewSale && (
        <Pressable accessibilityRole="button" onPress={onNewSale} style={({ pressed }) => [styles.todayAction, pressed && { opacity: 0.85 }]}>
          <Ionicons name="add-circle" size={20} color={colors.brand700} />
          <Text style={styles.todayActionLabel}>Nouvelle vente</Text>
        </Pressable>
      )}
    </View>
  );
}

function MonthStats({ stats, currency }: { stats: DashboardStats; currency: string }) {
  const revenueHint =
    stats.revenueChange === null ? (
      <Text style={styles.statHint}>Pas de vente sur la même période le mois dernier</Text>
    ) : (
      <Text style={styles.statHint}>
        <Text style={{ color: stats.revenueChange >= 0 ? colors.success : colors.danger, fontWeight: '600' }}>
          {formatPercent(stats.revenueChange)}
        </Text>{' '}
        vs mois dernier
      </Text>
    );

  return (
    <>
      <SectionHeader title="Ce mois-ci" />
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <StatCard label="Chiffre d'affaires" icon="bar-chart-outline" value={formatMoney(stats.revenue, currency)} hint={revenueHint} />
          <StatCard
            label="Bénéfice net"
            icon="cash-outline"
            value={formatMoney(stats.netProfit, currency)}
            tone={stats.netProfit >= 0 ? 'success' : 'danger'}
            hint="Marge brute − dépenses"
          />
        </View>
        <View style={styles.gridRow}>
          <StatCard
            label="Marge brute"
            icon="trending-up-outline"
            value={formatMoney(stats.grossMargin, currency)}
            tone={stats.grossMargin < 0 ? 'danger' : 'default'}
            hint={stats.grossMarginRate === null ? 'CA − coût des articles vendus' : `${formatPercent(stats.grossMarginRate, { signed: false })} du CA`}
          />
          <StatCard
            label="Dépenses"
            icon="wallet-outline"
            value={formatMoney(stats.expensesTotal, currency)}
            tone={stats.expensesTotal > 0 ? 'danger' : 'default'}
            hint="Boutique + charges générales"
          />
        </View>
        <View style={styles.gridRow}>
          <StatCard
            label="Ventes"
            icon="receipt-outline"
            value={formatNumber(stats.salesCount)}
            hint={stats.salesCount > 0 ? `Panier moyen : ${formatMoney(stats.averageBasket, currency)}` : 'Aucune vente ce mois-ci'}
          />
          <StatCard
            label="Alertes de stock"
            icon="alert-circle-outline"
            value={formatNumber(stats.lowStockCount)}
            tone={stats.outOfStockCount > 0 ? 'danger' : stats.lowStockCount > 0 ? 'warning' : 'success'}
            hint={
              stats.outOfStockCount > 0
                ? `dont ${stats.outOfStockCount} en rupture · ${formatNumber(stats.activeProductsCount)} produits actifs`
                : `Aucune rupture · ${formatNumber(stats.activeProductsCount)} produits actifs`
            }
          />
        </View>
      </View>
    </>
  );
}

function ActivityRow({
  activity,
  currency,
  onOpenSale,
}: {
  activity: DashboardStats['recentActivity'][number];
  currency: string;
  onOpenSale: (saleId: number) => void;
}) {
  const isExpense = activity.type === 'expense';
  const amountColor = activity.cancelled ? colors.textFaint : activity.amount < 0 ? colors.danger : colors.success;

  return (
    <Pressable
      accessibilityRole={isExpense ? 'text' : 'button'}
      disabled={isExpense}
      onPress={() => onOpenSale(activity.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.activityIcon, isExpense ? styles.activityIconExpense : styles.activityIconSale]}>
        <Ionicons name={isExpense ? 'wallet-outline' : 'receipt-outline'} size={16} color={isExpense ? colors.danger : colors.success} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {activity.label}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {isExpense ? 'Dépense · ' : ''}
          {activity.cancelled ? 'Annulée · ' : ''}
          {formatDateTime(activity.createdAt)} · {activity.subtitle}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color: amountColor }, activity.cancelled && { textDecorationLine: 'line-through' }]}>
        {activity.amount < 0 ? '-' : '+'}
        {formatMoney(Math.abs(activity.amount), currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  cardPadded: { padding: spacing.lg },
  footnote: { fontSize: font.xs, color: colors.textMuted, marginTop: spacing.md },

  today: { borderRadius: radius.xl, backgroundColor: colors.brand600, padding: spacing.xl, gap: 2 },
  todayLabel: { fontSize: font.sm, fontWeight: '500', color: colors.brand100 },
  todayValue: { fontSize: 34, fontWeight: '700', color: '#ffffff', fontVariant: ['tabular-nums'] },
  todayHint: { fontSize: font.sm, color: colors.brand100 },
  todayAction: {
    marginTop: spacing.lg,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  todayActionLabel: { fontSize: font.md, fontWeight: '600', color: colors.brand700 },

  grid: { gap: spacing.md },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  statHint: { fontSize: font.xs, color: colors.textMuted, lineHeight: 16 },

  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowPressed: { backgroundColor: colors.neutralBg },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: font.md, fontWeight: '500', color: colors.text },
  rowSubtitle: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  rowAmount: { fontSize: font.sm, fontWeight: '600', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  rank: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankLabel: { fontSize: font.xs, fontWeight: '600', color: colors.textMuted },
  activityIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  activityIconSale: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  activityIconExpense: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
  linkButton: { minHeight: 32, paddingHorizontal: 0 },
});
