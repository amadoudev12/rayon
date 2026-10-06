import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

export type SelectOption<T> = { value: T; label: string; description?: string };

/**
 * Liste de choix présentée en feuille montant du bas de l'écran : l'équivalent
 * tactile d'une liste déroulante.
 */
export function SelectSheet<T extends string | number | null>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  header,
  emptyLabel = 'Aucun élément',
}: {
  visible: boolean;
  title: string;
  options: SelectOption<T>[];
  selected: T | undefined;
  onSelect: (value: T) => void;
  onClose: () => void;
  /** Contenu au-dessus de la liste (recherche, ajout rapide…). */
  header?: ReactNode;
  emptyLabel?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button"
        accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable accessibilityRole="button"
        accessibilityLabel="Fermer" hitSlop={12} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          {header && <View style={styles.headerSlot}>{header}</View>}
          <FlatList
            data={options}
            keyExtractor={(option) => String(option.value)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>{emptyLabel}</Text>}
            renderItem={({ item }) => {
              const isSelected = item.value === selected;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.neutralBg }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{item.label}</Text>
                    {item.description && <Text style={styles.optionDescription}>{item.description}</Text>}
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={20} color={colors.brand600} />}
                </Pressable>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontSize: font.lg, fontWeight: '600', color: colors.text },
  headerSlot: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  option: {
    minHeight: TOUCH_TARGET + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  optionLabel: { fontSize: font.md, color: colors.text },
  optionLabelSelected: { color: colors.brand700, fontWeight: '600' },
  optionDescription: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: font.sm, paddingVertical: spacing.xxl },
});
