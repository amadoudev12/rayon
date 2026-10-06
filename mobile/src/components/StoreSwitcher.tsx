import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAccount } from '@/auth/SessionProvider';
import { SelectSheet } from '@/components/SelectSheet';
import { colors, font, radius, spacing } from '@/lib/theme';

/**
 * Boutique active, modifiable quand le compte a accès à plusieurs boutiques.
 * Le choix s'applique à toute l'application (tableau de bord, stock, ventes).
 */
export function StoreSwitcher() {
  const { profile, activeStore, activeStoreId, setActiveStore } = useAccount();
  const [open, setOpen] = useState(false);
  const canSwitch = profile.stores.length > 1;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={canSwitch ? `Boutique active : ${activeStore.nom}. Changer de boutique` : `Boutique : ${activeStore.nom}`}
        disabled={!canSwitch}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}>
        <Ionicons name="storefront-outline" size={15} color={colors.brand700} />
        <Text style={styles.label} numberOfLines={1}>
          {activeStore.nom}
        </Text>
        {canSwitch && <Ionicons name="chevron-down" size={14} color={colors.brand700} />}
      </Pressable>

      <SelectSheet
        visible={open}
        title="Changer de boutique"
        options={profile.stores.map((store) => ({
          value: store.id,
          label: store.nom,
          description: store.parDefaut ? 'Boutique principale' : undefined,
        }))}
        selected={activeStoreId}
        onSelect={setActiveStore}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    maxWidth: 260,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand200,
  },
  label: { flexShrink: 1, fontSize: font.sm, fontWeight: '600', color: colors.brand700 },
});
