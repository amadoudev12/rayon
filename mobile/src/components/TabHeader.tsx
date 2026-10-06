import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, spacing } from '@/lib/theme';

/** En-tête d'un onglet : grand titre, sous-titre, et contenu optionnel (recherche, filtres). */
export function TabHeader({
  title,
  subtitle,
  right,
  stacked = false,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** Place `right` sous le titre plutôt qu'à côté, quand le titre a besoin de toute la largeur. */
  stacked?: boolean;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {!stacked && right}
      </View>
      {stacked && right && <View style={styles.stackedRight}>{right}</View>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stackedRight: { flexDirection: 'row' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: font.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
});
