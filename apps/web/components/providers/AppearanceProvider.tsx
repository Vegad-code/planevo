'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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

export const STORAGE_KEYS = {
  accent: 'planevo-accent',
  fontSize: 'planevo-font-size',
  motion: 'planevo-motion',
} as const;

interface AppearanceContextValue {
  accent: AccentId;
  setAccent: (a: AccentId) => void;
  fontSize: FontSizeId;
  setFontSize: (f: FontSizeId) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
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

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>('honey');
  const [fontSize, setFontSizeState] = useState<FontSizeId>('default');
  const [reduceMotion, setReduceMotionState] = useState(false);

  // Hydrate from storage on mount (mirrors the no-flash inline script).
  useEffect(() => {
    const savedAccent = (localStorage.getItem(STORAGE_KEYS.accent) as AccentId) || 'honey';
    const savedFont = (localStorage.getItem(STORAGE_KEYS.fontSize) as FontSizeId) || 'default';
    const savedMotion = localStorage.getItem(STORAGE_KEYS.motion) === 'reduced';
    setAccentState(savedAccent);
    setFontSizeState(savedFont);
    setReduceMotionState(savedMotion);
    applyAccent(savedAccent);
    applyFontSize(savedFont);
    applyMotion(savedMotion);
  }, []);

  const setAccent = useCallback((a: AccentId) => {
    setAccentState(a);
    localStorage.setItem(STORAGE_KEYS.accent, a);
    applyAccent(a);
  }, []);

  const setFontSize = useCallback((f: FontSizeId) => {
    setFontSizeState(f);
    localStorage.setItem(STORAGE_KEYS.fontSize, f);
    applyFontSize(f);
  }, []);

  const setReduceMotion = useCallback((v: boolean) => {
    setReduceMotionState(v);
    localStorage.setItem(STORAGE_KEYS.motion, v ? 'reduced' : 'on');
    applyMotion(v);
  }, []);

  const resetAppearance = useCallback(() => {
    setAccent('honey');
    setFontSize('default');
    setReduceMotion(false);
  }, [setAccent, setFontSize, setReduceMotion]);

  return (
    <AppearanceContext.Provider
      value={{ accent, setAccent, fontSize, setFontSize, reduceMotion, setReduceMotion, resetAppearance }}
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

/**
 * Blocking script injected in <head> to apply accent / font-size / motion
 * BEFORE first paint, preventing a flash of the default theme.
 */
export const appearanceNoFlashScript = `(function(){try{
  var a=localStorage.getItem('${STORAGE_KEYS.accent}')||'honey';
  document.documentElement.setAttribute('data-accent',a);
  var f=localStorage.getItem('${STORAGE_KEYS.fontSize}')||'default';
  var s={compact:0.92,'default':1,large:1.1}[f]||1;
  document.documentElement.style.setProperty('--font-scale',String(s));
  if(localStorage.getItem('${STORAGE_KEYS.motion}')==='reduced'){document.documentElement.classList.add('reduce-motion');}
}catch(e){}})();`;
