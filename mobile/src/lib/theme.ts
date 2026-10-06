/**
 * Jetons de design de l'application mobile, repris de l'application web
 * (src/app/globals.css) : indigo de marque utilisé avec parcimonie, gris
 * ardoise, cartes blanches sur un fond légèrement teinté.
 */
export const colors = {
  brand50: '#eef2ff',
  brand100: '#e0e7ff',
  brand200: '#c7d2fe',
  brand500: '#6366f1',
  brand600: '#4f46e5',
  brand700: '#4338ca',

  canvas: '#f7f8fa',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',

  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textFaint: '#94a3b8',

  success: '#059669',
  successBg: '#ecfdf5',
  successBorder: '#a7f3d0',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  warning: '#d97706',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  neutralBg: '#f8fafc',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 8, md: 10, lg: 12, xl: 16, full: 999 } as const;

export const font = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
} as const;

/** Hauteur minimale d'une zone tactile (recommandation iOS 44 / Android 48). */
export const TOUCH_TARGET = 48;

export type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'brand';

export const toneColors: Record<Tone, { fg: string; bg: string; border: string }> = {
  neutral: { fg: colors.textSecondary, bg: colors.neutralBg, border: colors.border },
  success: { fg: colors.success, bg: colors.successBg, border: colors.successBorder },
  danger: { fg: colors.danger, bg: colors.dangerBg, border: colors.dangerBorder },
  warning: { fg: colors.warning, bg: colors.warningBg, border: colors.warningBorder },
  brand: { fg: colors.brand700, bg: colors.brand50, border: colors.brand200 },
};
