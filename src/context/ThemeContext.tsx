/**
 * ThemeContext — Single source of truth for app theme (dark/light).
 * Persists preference in AsyncStorage; provides colors and toggleTheme.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '../types/signal';
import type { ColorScheme } from '../constants/colors';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/colors';
import { LIGHT, DARK, Theme } from '../constants/theme';

const THEME_KEY = '@signal_theme';

type ThemeContextType = {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  colors: ColorScheme;
  themeObject: Theme;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const [userTheme, setUserTheme] = useState<ThemeMode | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setUserTheme(saved);
      }
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setUserTheme((prev) => {
      const current = prev || systemTheme;
      const next = current === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, [systemTheme]);

  const activeTheme = userTheme || systemTheme;
  const isDark = activeTheme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const themeObject = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, isDark, toggleTheme, colors, themeObject }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
