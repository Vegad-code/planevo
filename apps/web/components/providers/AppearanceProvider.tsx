'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

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
  { id: 'classic', name: 'Classic' },
  { id: 'floating', name: 'Floating pill' },
] as const;

export type SidebarStyleId = (typeof SIDEBAR_STYLES)[number]['id'];

export const STORAGE_KEYS = {
  accent: 'planevo-accent',
  fontSize: 'planevo-font-size',
  motion: 'planevo-motion',
  sidebarStyle: 'planevo-sidebar-style',
} as const;

interface AppearanceContextValue {
  accent: AccentId;
  setAccent: (a: AccentId) => void;
  fontSize: FontSizeId;
  setFontSize: (f: FontSizeId) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  sidebarStyle: SidebarStyleId;
  setSidebarStyle: (s: SidebarStyleId) => void;
  resetAppearance: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyAccent(accent: AccentId) {
  document.documentElement.setAttribute('data-accent', accent);
}
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

import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>('honey');
  const [fontSize, setFontSizeState] = useState<FontSizeId>('default');
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [sidebarStyle, setSidebarStyleState] = useState<SidebarStyleId>('classic');
  
  const { theme, setTheme } = useTheme();
  // Memoize the supabase client so it isn't recreated on every render
  const supabase = useMemo(() => createClient(), []);
  
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith('/dashboard')) {
      document.documentElement.setAttribute('data-public', 'true');
    } else {
      document.documentElement.removeAttribute('data-public');
    }
  }, [pathname]);

  // Hydrate from storage / Supabase strictly once on mount
  useEffect(() => {
    // Apply visual changes immediately (no React state) to prevent flash
    const localAccent = (localStorage.getItem(STORAGE_KEYS.accent) as AccentId) || 'honey';
    const localFont = (localStorage.getItem(STORAGE_KEYS.fontSize) as FontSizeId) || 'default';
    const localMotion = localStorage.getItem(STORAGE_KEYS.motion) === 'reduced';
    const localSidebarStyle = localStorage.getItem(STORAGE_KEYS.sidebarStyle);
    applyFontSize(localFont);
    applyMotion(localMotion);

    // Defer React state updates to avoid synchronous setState in effect body
    let isMounted = true;
    (async () => {
      await Promise.resolve(); // microtask boundary
      if (!isMounted) return;

      let savedAccent = localAccent;
      let savedFont = localFont;
      let savedMotion = localMotion;
      let savedSidebarStyle: SidebarStyleId = isSidebarStyleId(localSidebarStyle)
        ? localSidebarStyle
        : 'classic';

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const { data: profile } = await supabase
            .from('users')
            .select('theme, accent_color, font_size, reduce_motion, sidebar_style')
            .eq('id', session.user.id)
            .single();
          
          if (profile && isMounted) {
            if (profile.accent_color && ACCENTS.some(a => a.id === profile.accent_color)) {
              savedAccent = profile.accent_color as AccentId;
              localStorage.setItem(STORAGE_KEYS.accent, savedAccent);
            }
            if (profile.font_size && FONT_SIZES.some(f => f.id === profile.font_size)) {
              savedFont = profile.font_size as FontSizeId;
              localStorage.setItem(STORAGE_KEYS.fontSize, savedFont);
            }
            if (profile.reduce_motion !== null) {
              savedMotion = profile.reduce_motion;
              localStorage.setItem(STORAGE_KEYS.motion, savedMotion ? 'reduced' : 'normal');
            }
            if (isSidebarStyleId(profile.sidebar_style)) {
              savedSidebarStyle = profile.sidebar_style;
              localStorage.setItem(STORAGE_KEYS.sidebarStyle, savedSidebarStyle);
            }
            if (profile.theme && profile.theme !== theme) {
              setTheme(profile.theme);
            }
          }
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // ignore auth/network errors
      } finally {
        if (isMounted) {
          setAccentState(savedAccent);
          applyAccent(savedAccent);
          setFontSizeState(savedFont);
          applyFontSize(savedFont);
          setReduceMotionState(savedMotion);
          applyMotion(savedMotion);
          setSidebarStyleState(savedSidebarStyle);
          setIsReady(true);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]); // Removed setTheme to prevent unnecessary triggers

  // Sync theme changes back to Supabase
  // We use a ref to prevent syncing the very first load
  const themeInitialLoadRef = React.useRef(true);
  useEffect(() => {
    if (!isReady || !theme) return;
    if (themeInitialLoadRef.current) {
      themeInitialLoadRef.current = false;
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('users').update({ theme }).eq('id', session.user.id);
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {}
    }, 1000); // Debounce network request
    
    return () => clearTimeout(timeoutId);
  }, [theme, isReady, supabase]);

  const setAccent = useCallback(async (a: AccentId) => {
    // 1. Optimistic local update
    setAccentState(a);
    localStorage.setItem(STORAGE_KEYS.accent, a);
    applyAccent(a);
    
    // 2. Async background sync
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('users').update({ accent_color: a }).eq('id', session.user.id);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {}
  }, [supabase]);

  const setFontSize = useCallback(async (f: FontSizeId) => {
    setFontSizeState(f);
    localStorage.setItem(STORAGE_KEYS.fontSize, f);
    applyFontSize(f);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('users').update({ font_size: f }).eq('id', session.user.id);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {}
  }, [supabase]);

  const setReduceMotion = useCallback(async (v: boolean) => {
    setReduceMotionState(v);
    localStorage.setItem(STORAGE_KEYS.motion, v ? 'reduced' : 'normal');
    applyMotion(v);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('users').update({ reduce_motion: v }).eq('id', session.user.id);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {}
  }, [supabase]);

  const setSidebarStyle = useCallback(async (s: SidebarStyleId) => {
    setSidebarStyleState(s);
    localStorage.setItem(STORAGE_KEYS.sidebarStyle, s);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('users').update({ sidebar_style: s }).eq('id', session.user.id);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {}
  }, [supabase]);

  const resetAppearance = useCallback(() => {
    setAccent('honey');
    setFontSize('default');
    setReduceMotion(false);
    setSidebarStyle('classic');
    setTheme('system');
  }, [setAccent, setFontSize, setReduceMotion, setSidebarStyle, setTheme]);

  return (
    <AppearanceContext.Provider
      value={{ accent, setAccent, fontSize, setFontSize, reduceMotion, setReduceMotion, sidebarStyle, setSidebarStyle, resetAppearance }}
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
