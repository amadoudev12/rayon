import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { cancelSale, getSale } from '@/api/endpoints';
import { useAccount } from '@/auth/SessionProvider';
import { useToast } from '@/components/Toast';
import { Badge, Banner, Button, Card, Divider, ErrorState, InfoRow, LoadingState, SectionHeader } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { formatDateTime, formatMoney, formatNumber, saleNumber } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/labels';
import { colors, font, spacing } from '@/lib/theme';

export default function SaleDetailsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const saleId = Number(id);
  const { currency, can } = useAccount();
  const validId = Number.isInteger(saleId) && saleId > 0;

  const sale = useQuery({ queryKey: ['sales', 'detail', saleId], queryFn: () => getSale(saleId), enabled: validId });

  const cancel = useMutation({
    mutationFn: () => cancelSale(saleId),
    onSuccess: async () => {
      // L'annulation remet les articles en stock et modifie les chiffres du tableau de bord.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast('Vente annulée, stock rétabli');
    },
  });

  if (!validId) return <ErrorState message="Cette vente est introuvable." />;
  if (sale.isPending) return <LoadingState />;
  if (sale.isError) return <ErrorState message={errorMessage(sale.error)} onRetry={() => void sale.refetch()} />;

  const data = sale.data;
  const cancelled = data.statut === 'CANCELLED';
  const resteAPayer = Number(data.total) - Number(data.montantPaye);

  function confirmCancel() {
    confirmAction({
      title: 'Annuler cette vente ?',
      message: 'Les articles seront remis en stock. Cette action est définitive.',
      confirmLabel: 'Annuler la vente',
      destructive: true,
      onConfirm: () => cancel.mutate(),
    });
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: `Vente ${saleNumber(data.id)}` }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={sale.isRefetching} onRefresh={() => void sale.refetch()} tintColor={colors.brand600} colors={[colors.brand600]} />
        }>
        <Text style={[styles.total, cancelled && styles.totalCancelled]}>{formatMoney(Number(data.total), currency)}</Text>
        <Text style={styles.date}>{formatDateTime(data.creeLe)}</Text>
        <View style={styles.badges}>
          <Badge dot tone={cancelled ? 'danger' : 'success'} label={cancelled ? 'Annulée' : 'Terminée'} />
          <Badge tone="brand" label={PAYMENT_METHOD_LABELS[data.modePaiement]} />
        </View>
        {cancelled && data.annuleLe && <Text style={styles.cancelledAt}>Annulée le {formatDateTime(data.annuleLe)}</Text>}

        {cancel.isError && (
          <View style={{ marginTop: spacing.lg }}>
            <Banner message={errorMessage(cancel.error)} />
          </View>
        )}

        <SectionHeader title="Informations" />
        <Card style={styles.cardPadded}>
          <InfoRow
            label="Client"
            value={data.client ? `${data.client.nom}${data.client.telephone ? `\n${data.client.telephone}` : ''}` : 'Client de passage'}
          />
          <Divider />
          <InfoRow label="Vendeur" value={`${data.vendeur.prenom} ${data.vendeur.nom}`} />
          <Divider />
          <InfoRow label="Boutique" value={data.boutique.nom} />
        </Card>

        <SectionHeader title={`Articles (${data.lignes.length})`} />
        <Card>
          {data.lignes.map((line, index) => (
            <View key={line.id}>
              {index > 0 && <Divider />}
              <View style={styles.line}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName}>{line.produit.nom}</Text>
                  <Text style={styles.lineMeta}>
                    {formatNumber(line.quantite)} {line.produit.unite} × {formatMoney(Number(line.prixUnitaire), currency)}
                  </Text>
                </View>
                <Text style={styles.lineAmount}>{formatMoney(Number(line.sousTotal), currency)}</Text>
              </View>
            </View>
          ))}
        </Card>

        <SectionHeader title="Montants" />
        <Card style={styles.cardPadded}>
          <InfoRow label="Sous-total" value={formatMoney(Number(data.sousTotal), currency)} />
          <InfoRow label="Remise" value={`-${formatMoney(Number(data.remise), currency)}`} />
          <Divider />
          <InfoRow label="Total" value={formatMoney(Number(data.total), currency)} strong />
          <InfoRow label="Montant payé" value={formatMoney(Number(data.montantPaye), currency)} />
          {resteAPayer > 0 && <InfoRow label="Reste à payer" value={formatMoney(resteAPayer, currency)} valueColor={colors.warning} />}
        </Card>

        {data.note && (
          <>
            <SectionHeader title="Note" />
            <Card style={{ padding: spacing.lg }}>
              <Text style={styles.note}>{data.note}</Text>
            </Card>
          </>
        )}
      </ScrollView>

      {can('sale:cancel') && !cancelled && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label="Annuler la vente" variant="danger" loading={cancel.isPending} onPress={confirmCancel} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  total: { fontSize: 30, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  totalCancelled: { color: colors.textFaint, textDecorationLine: 'line-through' },
  date: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  cancelledAt: { fontSize: font.xs, color: colors.textMuted, marginTop: spacing.sm },
  cardPadded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  lineName: { fontSize: font.md, fontWeight: '500', color: colors.text },
  lineMeta: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  lineAmount: { fontSize: font.md, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  note: { fontSize: font.sm, color: colors.textSecondary, lineHeight: 20 },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
