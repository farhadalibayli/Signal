// src/constants/theme.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all color/shadow tokens.
// Screens import useTheme() which reads from ThemeContext (light | dark).
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';

export interface Theme {
    mode: ThemeMode;

    // Backgrounds
    bg: string;   // page background
    surface: string;   // elevated surface (cards, sheets)
    surfaceAlt: string;  // slightly different surface (nested cards)

    // Borders
    border: string;
    borderFocus: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;

    // Brand
    primary: string;
    primarySoft: string;  // low-opacity primary for backgrounds
    accent: string;
    accentSoft: string;

    // Semantic
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    error: string;
    errorSoft: string;

    // Shadows (iOS)
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;

    // Card style helper
    cardShadow: {
        shadowColor: string;
        shadowOffset: { width: number; height: number };
        shadowOpacity: number;
        shadowRadius: number;
        elevation: number;
    };
}

export const LIGHT: Theme = {
    mode: 'light',

    bg: '#F3F0FF',
    surface: '#FFFFFF',
    surfaceAlt: '#F8F6FF',

    border: '#E4DEFF',
    borderFocus: '#6C47FF',

    textPrimary: '#1A1240',
    textSecondary: '#6B5FA0',
    textTertiary: '#A89FCC',

    primary: '#6C47FF',
    primarySoft: 'rgba(108,71,255,0.10)',
    accent: '#9B7FFF',
    accentSoft: 'rgba(155,127,255,0.12)',

    success: '#059669',
    successSoft: 'rgba(5,150,105,0.10)',
    warning: '#D97706',
    warningSoft: 'rgba(217,119,6,0.10)',
    error: '#DC2626',
    errorSoft: 'rgba(220,38,38,0.09)',

    shadowColor: '#5B3FBB',
    shadowOpacity: 0.10,
    shadowRadius: 14,

    cardShadow: {
        shadowColor: '#5B3FBB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.09,
        shadowRadius: 16,
        elevation: 4,
    },
};

export const DARK: Theme = {
    mode: 'dark',

    bg: '#0D0A1E',
    surface: '#1A1530',
    surfaceAlt: '#13102A',

    border: '#2A2248',
    borderFocus: '#6C47FF',

    textPrimary: '#F0EDFF',
    textSecondary: '#9B93C0',
    textTertiary: '#5C5680',

    primary: '#7C5FFF',
    primarySoft: 'rgba(124,95,255,0.15)',
    accent: '#A98FFF',
    accentSoft: 'rgba(169,143,255,0.12)',

    success: '#10B981',
    successSoft: 'rgba(16,185,129,0.12)',
    warning: '#F59E0B',
    warningSoft: 'rgba(245,158,11,0.12)',
    error: '#EF4444',
    errorSoft: 'rgba(239,68,68,0.12)',

    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,

    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 8,
    },
};

export function getTheme(mode: ThemeMode): Theme {
    return mode === 'dark' ? DARK : LIGHT;
}