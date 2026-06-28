'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface BrunoDockContextValue {
  isOpen: boolean;
  openBruno: () => void;
  closeBruno: () => void;
  toggleBruno: () => void;
}

const BrunoDockContext = createContext<BrunoDockContextValue | null>(null);

export function BrunoDockProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openBruno = useCallback(() => setIsOpen(true), []);
  const closeBruno = useCallback(() => setIsOpen(false), []);
  const toggleBruno = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({ isOpen, openBruno, closeBruno, toggleBruno }),
    [isOpen, openBruno, closeBruno, toggleBruno],
  );

  return <BrunoDockContext.Provider value={value}>{children}</BrunoDockContext.Provider>;
}

export function useBrunoDock() {
  const ctx = useContext(BrunoDockContext);
  if (!ctx) throw new Error('useBrunoDock must be used within BrunoDockProvider');
  return ctx;
}
