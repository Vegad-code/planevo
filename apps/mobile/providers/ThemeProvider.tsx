import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Colors, ACCENTS, ACCENT_LIST, type AccentId } from '@/constants/Colors';

export type ThemeMode = 'system' | 'light' | 'dark';

const MODE_KEY = 'planevo-theme-mode';
const ACCENT_KEY = 'planevo-theme-accent';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  accentId: AccentId;
  setAccent: (a: AccentId) => void;
  scheme: 'light' | 'dark';
  isDark: boolean;
  colors: typeof Colors.light;
  accents: typeof ACCENT_LIST;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme() ?? 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [accentId, setAccentState] = useState<AccentId>('honey');

  useEffect(() => {
    (async () => {
      try {
        const savedMode = (await SecureStore.getItemAsync(MODE_KEY)) as ThemeMode | null;
        const savedAccent = (await SecureStore.getItemAsync(ACCENT_KEY)) as AccentId | null;
        if (savedMode) setModeState(savedMode);
        if (savedAccent && ACCENTS[savedAccent]) setAccentState(savedAccent);
      } catch {
        /* fall back to defaults */
      }
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    SecureStore.setItemAsync(MODE_KEY, m).catch(() => {});
  }, []);

  const setAccent = useCallback((a: AccentId) => {
    setAccentState(a);
    SecureStore.setItemAsync(ACCENT_KEY, a).catch(() => {});
  }, []);

  const scheme: 'light' | 'dark' = mode === 'system' ? (deviceScheme as 'light' | 'dark') : mode;
  const isDark = scheme === 'dark';

  const colors = useMemo(() => {
    const base = isDark ? Colors.dark : Colors.light;
    const acc = ACCENTS[accentId] ?? ACCENTS.honey;
    const tint = isDark ? acc.primary : acc.deep;
    return { ...base, tint, tabIconSelected: tint };
  }, [isDark, accentId]);

  const value = useMemo(
    () => ({ mode, setMode, accentId, setAccent, scheme, isDark, colors, accents: ACCENT_LIST }),
    [mode, setMode, accentId, setAccent, scheme, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  // Safe fallback if used outside provider (keeps existing screens crash-free).
  return {
    mode: 'system',
    setMode: () => {},
    accentId: 'honey',
    setAccent: () => {},
    scheme: 'light',
    isDark: false,
    colors: Colors.light,
    accents: ACCENT_LIST,
  };
}
