import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DashboardStats } from '@/api/types';
import { Card, type IconName } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { colors, font, radius, spacing } from '@/lib/theme';

const VALUE_TONES = {
  default: colors.text,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
} as const;

/** Carte de statistique : libellé, valeur en évidence, ligne d'explication. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon: IconName;
  tone?: keyof typeof VALUE_TONES;
}) {
  return (
    <Card style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel} numberOfLines={2}>
          {label}
        </Text>
        <View style={styles.statIcon}>
          <Ionicons name={icon} size={15} color={colors.textMuted} />
        </View>
      </View>
      <Text style={[styles.statValue, { color: VALUE_TONES[tone] }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {typeof hint === 'string' ? <Text style={styles.statHint}>{hint}</Text> : hint}
    </Card>
  );
}

const CHART_HEIGHT = 120;

/**
 * Chiffre d'affaires des 7 derniers jours : une seule série, donc une seule
 * teinte et pas de légende. Toucher une barre affiche sa valeur exacte
 * (l'équivalent tactile de l'infobulle du web).
 */
export function RevenueTrendChart({ data, currency }: { data: DashboardStats['trend']; currency: string }) {
  // Par défaut, le dernier jour (aujourd'hui) est sélectionné.
  const [selectedIndex, setSelectedIndex] = useState(data.length - 1);
  const safeIndex = Math.min(selectedIndex, data.length - 1);
  const selected = data[safeIndex];
  const max = Math.max(...data.map((point) => point.value), 0);

  if (!selected) return null;

  return (
    <View>
      <View style={styles.chartReadout}>
        <Text style={styles.chartReadoutDay}>{selected.day}</Text>
        <Text style={styles.chartReadoutValue}>
          {formatMoney(selected.value, currency)} · {selected.count} vente(s)
        </Text>
      </View>
      <View style={styles.chartPlot}>
        {data.map((point, index) => {
          const isSelected = index === safeIndex;
          // Une valeur non nulle reste visible même très petite face au maximum.
          const height = max > 0 && point.value > 0 ? Math.max(4, (point.value / max) * CHART_HEIGHT) : 0;
          return (
            <Pressable
              key={point.day}
              accessibilityRole="button"
              accessibilityLabel={`${point.day} : ${formatMoney(point.value, currency)}, ${point.count} vente(s)`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedIndex(index)}
              style={styles.chartColumn}>
              <View style={styles.chartBarArea}>
                <View style={[styles.chartBar, { height, backgroundColor: isSelected ? colors.brand600 : colors.brand200 }]} />
              </View>
              <Text style={[styles.chartAxisLabel, isSelected && styles.chartAxisLabelSelected]} numberOfLines={1}>
                {point.day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: { flex: 1, padding: spacing.md, gap: 4 },
  statHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  statLabel: { flex: 1, fontSize: font.xs, fontWeight: '500', color: colors.textMuted },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: font.xl, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statHint: { fontSize: font.xs, color: colors.textMuted, lineHeight: 16 },

  chartReadout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md },
  chartReadoutDay: { fontSize: font.sm, fontWeight: '600', color: colors.text },
  chartReadoutValue: { fontSize: font.sm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  chartPlot: { flexDirection: 'row', gap: 2 },
  // Chaque colonne est une zone tactile pleine largeur, bien plus grande que la barre.
  chartColumn: { flex: 1, alignItems: 'center', gap: 6 },
  chartBarArea: {
    height: CHART_HEIGHT,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chartBar: { width: '56%', maxWidth: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  chartAxisLabel: { fontSize: 10, color: colors.textFaint },
  chartAxisLabelSelected: { color: colors.text, fontWeight: '600' },
});
