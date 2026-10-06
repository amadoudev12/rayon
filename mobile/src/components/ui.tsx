import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, font, radius, spacing, toneColors, TOUCH_TARGET, type Tone } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// --- Carte -------------------------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Titre de section au-dessus d'une carte ou d'une liste. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

// --- Bouton ------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  const foreground = variant === 'primary' || variant === 'danger' ? '#ffffff' : variant === 'ghost' ? colors.brand600 : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonVariants[variant],
        pressed && styles.pressed,
        inactive && styles.buttonDisabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={foreground} />}
          <Text style={[styles.buttonLabel, { color: foreground }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Bouton d'action principal flottant en bas d'une liste. */
export function Fab({ label, icon, onPress, bottom }: { label: string; icon: IconName; onPress: () => void; bottom: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color="#ffffff" />
      <Text style={styles.fabLabel}>{label}</Text>
    </Pressable>
  );
}

// --- Badge -------------------------------------------------------------------

export function Badge({ label, tone = 'neutral', dot = false }: { label: string; tone?: Tone; dot?: boolean }) {
  const palette = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      {dot && <View style={[styles.badgeDot, { backgroundColor: palette.fg }]} />}
      <Text style={[styles.badgeLabel, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// --- Champs de formulaire ----------------------------------------------------

export function Field({
  label,
  error,
  hint,
  children,
  style,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Input({ invalid, style, ...props }: TextInputProps & { invalid?: boolean; ref?: Ref<TextInput> }) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      {...props}
      style={[styles.input, invalid && styles.inputInvalid, props.editable === false && styles.inputDisabled, style]}
    />
  );
}

/** Champ qui ouvre une liste de choix au lieu du clavier. */
export function SelectField({ value, placeholder, onPress }: { value?: string | null; placeholder: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.input, styles.select, pressed && styles.pressed]}>
      <Text style={[styles.selectValue, !value && { color: colors.textFaint }]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

export function SearchBar({ value, onChangeText, placeholder }: { value: string; onChangeText: (text: string) => void; placeholder: string }) {
  return (
    <View style={styles.searchBar}>
      <Ionicons name="search" size={18} color={colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={styles.searchInput}
      />
      {value.length > 0 && (
        <Pressable accessibilityRole="button"
        accessibilityLabel="Effacer la recherche" hitSlop={12} onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={18} color={colors.textFaint} />
        </Pressable>
      )}
    </View>
  );
}

/** Rangée de filtres exclusifs (un seul actif). */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  wrap = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  wrap?: boolean;
}) {
  return (
    <View style={[styles.chipGroup, wrap && { flexWrap: 'wrap' }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}>
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Sélecteur de quantité − / + avec de grandes zones tactiles. */
export function QuantityStepper({
  value,
  max,
  onChange,
  min = 0,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Diminuer la quantité"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
        <Ionicons name="remove" size={20} color={value <= min ? colors.textFaint : colors.text} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Augmenter la quantité"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}>
        <Ionicons name="add" size={20} color={value >= max ? colors.textFaint : colors.text} />
      </Pressable>
    </View>
  );
}

// --- Lignes d'information ----------------------------------------------------

/** Paire libellé / valeur sur une ligne (fiches de détail). */
export function InfoRow({ label, value, valueColor, strong = false }: { label: string; value: string; valueColor?: string; strong?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, strong && styles.infoStrong]}>{label}</Text>
      <Text style={[styles.infoValue, strong && styles.infoStrong, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

// --- États : chargement, vide, erreur ----------------------------------------

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <View style={styles.state} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.brand600} />
      <Text style={styles.stateDescription}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <View style={[styles.state, compact && styles.stateCompact]}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={22} color={colors.textMuted} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {description && <Text style={styles.stateDescription}>{description}</Text>}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <View style={[styles.stateIcon, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
        <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
      </View>
      <Text style={styles.stateTitle}>Chargement impossible</Text>
      <Text style={styles.stateDescription}>{message}</Text>
      {onRetry && <Button label="Réessayer" icon="refresh" variant="secondary" onPress={onRetry} style={{ marginTop: spacing.sm }} />}
    </View>
  );
}

/** Message d'erreur ou d'information affiché dans le flux d'un écran. */
export function Banner({ message, tone = 'danger' }: { message: string; tone?: Tone }) {
  const palette = toneColors[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }]} accessibilityRole="alert">
      <Ionicons name={tone === 'danger' ? 'alert-circle' : 'information-circle'} size={18} color={palette.fg} />
      <Text style={[styles.bannerText, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: colors.brand600 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: font.md, fontWeight: '600', color: colors.text },

  button: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonLabel: { fontSize: font.md, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: colors.brand600,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    elevation: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabLabel: { color: '#ffffff', fontSize: font.md, fontWeight: '600' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeLabel: { fontSize: font.xs, fontWeight: '600' },

  field: { gap: 6 },
  fieldLabel: { fontSize: font.sm, fontWeight: '500', color: colors.textSecondary },
  fieldError: { fontSize: font.xs, color: colors.danger },
  fieldHint: { fontSize: font.xs, color: colors.textMuted },
  input: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: font.md,
    color: colors.text,
  },
  inputInvalid: { borderColor: colors.danger },
  inputDisabled: { backgroundColor: colors.neutralBg, color: colors.textMuted },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  selectValue: { flex: 1, fontSize: font.md, color: colors.text },

  searchBar: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: font.md, color: colors.text, paddingVertical: 0 },

  chipGroup: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.brand50, borderColor: colors.brand500 },
  chipLabel: { fontSize: font.sm, fontWeight: '500', color: colors.textSecondary },
  chipLabelSelected: { color: colors.brand700, fontWeight: '600' },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepperButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepperValue: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: font.md,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.lg, paddingVertical: 6 },
  infoLabel: { fontSize: font.sm, color: colors.textMuted },
  infoValue: { flexShrink: 1, textAlign: 'right', fontSize: font.sm, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  infoStrong: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },

  state: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 56, paddingHorizontal: spacing.xxl },
  stateCompact: { paddingVertical: spacing.xxl },
  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutralBg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  stateTitle: { fontSize: font.md, fontWeight: '600', color: colors.text, textAlign: 'center' },
  stateDescription: { fontSize: font.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  bannerText: { flex: 1, fontSize: font.sm, lineHeight: 19 },
});
