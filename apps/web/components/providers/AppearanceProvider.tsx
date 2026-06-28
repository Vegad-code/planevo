'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import {
  COLOR_THEMES,
  migrateAccentToColorTheme,
  isColorThemeId,
  type ColorThemeId,
} from '@planevo/theme';
import { syncDomAppearance } from '@/lib/appearance/sync-dom-appearance';
import {
  APPEARANCE_STORAGE_KEYS,
  clearLegacyAppearanceStorage,
  readScopedAppearanceItem,
  writeScopedAppearanceItem,
} from '@/lib/appearance/appearance-storage';

export { COLOR_THEMES };

export const ACCENTS = [
  { id: 'honey', name: 'Honey', color: '#D08741' },
  { id: 'terracotta', name: 'Terracotta', color: '#C9663B' },
  { id: 'amber', name: 'Amber', color: '#DDA02C' },
  { id: 'rosewood', name: 'Rosewood', color: '#C2675C' },
  { id: 'sage', name: 'Sage', color: '#6F9266' },
  { id: 'ocean', name: 'Ocean', color: '#3E8194' },
  { id: 'plum', name: 'Plum', color: '#9A5F84' },
] as const;

export type AccentId = (typeof ACCENTS)[number]['id'];

export const FONT_SIZES = [
  { id: 'compact', name: 'Compact', scale: 0.92 },
  { id: 'default', name: 'Default', scale: 1 },
  { id: 'large', name: 'Large', scale: 1.1 },
] as const;

export type FontSizeId = (typeof FONT_SIZES)[number]['id'];

export const SIDEBAR_STYLES = [
  { id: 'glass', name: 'Liquid glass' },
  { id: 'classic', name: 'Classic' },
  { id: 'floating', name: 'Floating pill' },
] as const;

export type SidebarStyleId = (typeof SIDEBAR_STYLES)[number]['id'];

/** @deprecated Use APPEARANCE_STORAGE_KEYS from appearance-storage */
export const STORAGE_KEYS = APPEARANCE_STORAGE_KEYS;

const DEFAULT_APPEARANCE = {
  accent: 'honey' as AccentId,
  colorTheme: 'classic' as ColorThemeId,
  fontSize: 'default' as FontSizeId,
  reduceMotion: false,
  sidebarStyle: 'glass' as SidebarStyleId,
};

interface AppearanceContextValue {
  accent: AccentId;
  setAccent: (a: AccentId) => void;
  colorTheme: ColorThemeId;
  setColorTheme: (theme: ColorThemeId) => void;
  fontSize: FontSizeId;
  setFontSize: (f: FontSizeId) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  sidebarStyle: SidebarStyleId;
  setSidebarStyle: (s: SidebarStyleId) => void;
  resetAppearance: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyFontSize(id: FontSizeId) {
  const found = FONT_SIZES.find((f) => f.id === id) ?? FONT_SIZES[1];
  document.documentElement.style.setProperty('--font-scale', String(found.scale));
}

function applyMotion(reduce: boolean) {
  document.documentElement.classList.toggle('reduce-motion', reduce);
}

function isSidebarStyleId(value: string | null | undefined): value is SidebarStyleId {
  return SIDEBAR_STYLES.some((s) => s.id === value);
}

function isAccentId(value: string | null | undefined): value is AccentId {
  return ACCENTS.some((a) => a.id === value);
}

function isFontSizeId(value: string | null | undefined): value is FontSizeId {
  return FONT_SIZES.some((f) => f.id === value);
}

type UserAppearanceProfile = {
  theme: string | null;
  accent_color: string | null;
  color_theme: string | null;
  font_size: string | null;
  reduce_motion: boolean | null;
  sidebar_style: string | null;
};

type AppearancePrefs = {
  accent: AccentId;
  colorTheme: ColorThemeId;
  fontSize: FontSizeId;
  reduceMotion: boolean;
  sidebarStyle: SidebarStyleId;
};

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_APPEARANCE.accent);
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(DEFAULT_APPEARANCE.colorTheme);
  const [fontSize, setFontSizeState] = useState<FontSizeId>(DEFAULT_APPEARANCE.fontSize);
  const [reduceMotion, setReduceMotionState] = useState(DEFAULT_APPEARANCE.reduceMotion);
  const [sidebarStyle, setSidebarStyleState] = useState<SidebarStyleId>(
    DEFAULT_APPEARANCE.sidebarStyle,
  );
  const [userId, setUserId] = useState<string | null>(null);

  const { theme, setTheme, resolvedTheme } = useTheme();
  const supabase = useMemo(() => createClient(), []);
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();

  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    syncDomAppearance({ pathname, accent, colorTheme, isDark });
  }, [pathname, accent, colorTheme, isDark]);

  const commitAppearance = useCallback(
    (prefs: AppearancePrefs) => {
      setAccentState(prefs.accent);
      setColorThemeState(prefs.colorTheme);
      setFontSizeState(prefs.fontSize);
      setReduceMotionState(prefs.reduceMotion);
      setSidebarStyleState(prefs.sidebarStyle);
      syncDomAppearance({
        pathname,
        accent: prefs.accent,
        colorTheme: prefs.colorTheme,
        isDark,
      });
      applyFontSize(prefs.fontSize);
      applyMotion(prefs.reduceMotion);
    },
    [isDark, pathname],
  );

  const loadAppearanceForUser = useCallback(
    async (activeUserId: string) => {
      let savedAccent = DEFAULT_APPEARANCE.accent;
      let savedColorTheme = DEFAULT_APPEARANCE.colorTheme;
      let savedFont = DEFAULT_APPEARANCE.fontSize;
      let savedMotion = DEFAULT_APPEARANCE.reduceMotion;
      let savedSidebarStyle = DEFAULT_APPEARANCE.sidebarStyle;

      const cachedAccent = readScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.accent, activeUserId);
      const cachedColorThemeRaw = readScopedAppearanceItem(
        APPEARANCE_STORAGE_KEYS.colorTheme,
        activeUserId,
      );
      const cachedFont = readScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.fontSize, activeUserId);
      const cachedMotion = readScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.motion, activeUserId);
      const cachedSidebarStyle = readScopedAppearanceItem(
        APPEARANCE_STORAGE_KEYS.sidebarStyle,
        activeUserId,
      );

      if (isAccentId(cachedAccent)) {
        savedAccent = cachedAccent;
      }
      if (isColorThemeId(cachedColorThemeRaw)) {
        savedColorTheme = cachedColorThemeRaw;
      } else if (isAccentId(cachedAccent)) {
        savedColorTheme = migrateAccentToColorTheme(cachedAccent);
      }
      if (isFontSizeId(cachedFont)) {
        savedFont = cachedFont;
      }
      if (cachedMotion === 'reduced') {
        savedMotion = true;
      } else if (cachedMotion === 'normal') {
        savedMotion = false;
      }
      if (isSidebarStyleId(cachedSidebarStyle)) {
        savedSidebarStyle = cachedSidebarStyle;
      }

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('theme, accent_color, color_theme, font_size, reduce_motion, sidebar_style')
          .eq('id', activeUserId)
          .single();

        const appearance = profile as UserAppearanceProfile | null;

        if (appearance) {
          if (isAccentId(appearance.accent_color)) {
            savedAccent = appearance.accent_color;
            writeScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.accent, activeUserId, savedAccent);
          }
          if (isColorThemeId(appearance.color_theme)) {
            savedColorTheme = appearance.color_theme;
            writeScopedAppearanceItem(
              APPEARANCE_STORAGE_KEYS.colorTheme,
              activeUserId,
              savedColorTheme,
            );
          } else if (isAccentId(appearance.accent_color)) {
            savedColorTheme = migrateAccentToColorTheme(appearance.accent_color);
            writeScopedAppearanceItem(
              APPEARANCE_STORAGE_KEYS.colorTheme,
              activeUserId,
              savedColorTheme,
            );
          }
          if (isFontSizeId(appearance.font_size)) {
            savedFont = appearance.font_size;
            writeScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.fontSize, activeUserId, savedFont);
          }
          if (appearance.reduce_motion !== null) {
            savedMotion = appearance.reduce_motion;
            writeScopedAppearanceItem(
              APPEARANCE_STORAGE_KEYS.motion,
              activeUserId,
              savedMotion ? 'reduced' : 'normal',
            );
          }
          if (isSidebarStyleId(appearance.sidebar_style)) {
            savedSidebarStyle = appearance.sidebar_style;
            writeScopedAppearanceItem(
              APPEARANCE_STORAGE_KEYS.sidebarStyle,
              activeUserId,
              savedSidebarStyle,
            );
          }
          if (appearance.theme && appearance.theme !== theme) {
            setTheme(appearance.theme);
          }
        }
      } catch {
        // ignore auth/network errors — use scoped cache or defaults
      }

      commitAppearance({
        accent: savedAccent,
        colorTheme: savedColorTheme,
        fontSize: savedFont,
        reduceMotion: savedMotion,
        sidebarStyle: savedSidebarStyle,
      });
      setIsReady(true);
    },
    [commitAppearance, setTheme, supabase, theme],
  );

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      const activeUserId = session?.user?.id ?? null;
      setUserId(activeUserId);

      if (event === 'SIGNED_OUT') {
        clearLegacyAppearanceStorage();
        commitAppearance(DEFAULT_APPEARANCE);
        setIsReady(true);
        return;
      }

      if (activeUserId) {
        void loadAppearanceForUser(activeUserId);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      const activeUserId = session?.user?.id ?? null;
      setUserId(activeUserId);

      if (activeUserId) {
        void loadAppearanceForUser(activeUserId);
        return;
      }

      clearLegacyAppearanceStorage();
      commitAppearance(DEFAULT_APPEARANCE);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [commitAppearance, loadAppearanceForUser, supabase]);

  const themeInitialLoadRef = React.useRef(true);
  useEffect(() => {
    if (!isReady || !theme || !userId) return;
    if (themeInitialLoadRef.current) {
      themeInitialLoadRef.current = false;
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        await supabase.from('users').update({ theme }).eq('id', userId);
      } catch {
        // ignore
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [theme, isReady, supabase, userId]);

  const setAccent = useCallback(
    async (a: AccentId) => {
      setAccentState(a);
      syncDomAppearance({ pathname, accent: a, colorTheme, isDark });

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          writeScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.accent, session.user.id, a);
          await supabase.from('users').update({ accent_color: a }).eq('id', session.user.id);
        }
      } catch {
        // ignore
      }
    },
    [colorTheme, isDark, pathname, supabase],
  );

  const setColorTheme = useCallback(
    async (nextTheme: ColorThemeId) => {
      setColorThemeState(nextTheme);
      syncDomAppearance({ pathname, accent, colorTheme: nextTheme, isDark });

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          writeScopedAppearanceItem(
            APPEARANCE_STORAGE_KEYS.colorTheme,
            session.user.id,
            nextTheme,
          );
          await supabase
            .from('users')
            .update({ color_theme: nextTheme } as { color_theme: string })
            .eq('id', session.user.id);
        }
      } catch {
        // ignore
      }
    },
    [accent, isDark, pathname, supabase],
  );

  const setFontSize = useCallback(
    async (f: FontSizeId) => {
      setFontSizeState(f);
      applyFontSize(f);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          writeScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.fontSize, session.user.id, f);
          await supabase.from('users').update({ font_size: f }).eq('id', session.user.id);
        }
      } catch {
        // ignore
      }
    },
    [supabase],
  );

  const setReduceMotion = useCallback(
    async (v: boolean) => {
      setReduceMotionState(v);
      applyMotion(v);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          writeScopedAppearanceItem(
            APPEARANCE_STORAGE_KEYS.motion,
            session.user.id,
            v ? 'reduced' : 'normal',
          );
          await supabase.from('users').update({ reduce_motion: v }).eq('id', session.user.id);
        }
      } catch {
        // ignore
      }
    },
    [supabase],
  );

  const setSidebarStyle = useCallback(
    async (s: SidebarStyleId) => {
      setSidebarStyleState(s);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          writeScopedAppearanceItem(APPEARANCE_STORAGE_KEYS.sidebarStyle, session.user.id, s);
          await supabase.from('users').update({ sidebar_style: s }).eq('id', session.user.id);
        }
      } catch {
        // ignore
      }
    },
    [supabase],
  );

  const resetAppearance = useCallback(() => {
    setAccent('honey');
    setColorTheme('classic');
    setFontSize('default');
    setReduceMotion(false);
    setSidebarStyle('glass');
    setTheme('system');
  }, [setAccent, setColorTheme, setFontSize, setReduceMotion, setSidebarStyle, setTheme]);

  return (
    <AppearanceContext.Provider
      value={{
        accent,
        setAccent,
        colorTheme,
        setColorTheme,
        fontSize,
        setFontSize,
        reduceMotion,
        setReduceMotion,
        sidebarStyle,
        setSidebarStyle,
        resetAppearance,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider');
  return ctx;
}
