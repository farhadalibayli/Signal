/**
 * SIGNAL official color system — dark and light themes.
 * Use via useTheme().colors; do not import COLORS in new code.
 */
export const DARK_COLORS = {
  background: '#0D0A1E',
  primary: '#6C47FF',
  accent: '#9B7FFF',
  surface: '#1A1529',
  border: '#2D2450',
  textPrimary: '#FFFFFF',
  textSecondary: '#9B7FFF',
  success: '#16A34A',
  error: '#DC2626',
  warning: '#F59E0B',
  disabled: '#2D2450',
  card: '#1A1529',
} as const;

export const LIGHT_COLORS = {
  background: '#F5F3FF',
  primary: '#6C47FF',
  accent: '#7C5CFF',
  surface: '#FFFFFF',
  border: '#E5E0FF',
  textPrimary: '#1A1529',
  textSecondary: '#6B7280',
  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',
  disabled: '#E5E0FF',
  card: '#FFFFFF',
} as const;

export const LIGHT_SHADOW = 'rgba(108,71,255,0.08)';

/** @deprecated Use useTheme().colors */
export const COLORS = {
  BACKGROUND: DARK_COLORS.background,
  PRIMARY: DARK_COLORS.primary,
  ACCENT: DARK_COLORS.accent,
  LIGHT_PURPLE: '#EEE9FF',
  SURFACE: DARK_COLORS.surface,
  BORDER: DARK_COLORS.border,
  TEXT_PRIMARY: DARK_COLORS.textPrimary,
  TEXT_SECONDARY: DARK_COLORS.textSecondary,
  SUCCESS: DARK_COLORS.success,
  ERROR: DARK_COLORS.error,
  WARNING: DARK_COLORS.warning,
  DISABLED: DARK_COLORS.disabled,
} as const;

export interface ColorScheme {
  background: string;
  primary: string;
  accent: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  error: string;
  warning: string;
  disabled: string;
  card: string;
}
