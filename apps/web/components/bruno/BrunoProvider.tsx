'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  BrunoContextValue,
  BrunoPageContext,
} from '@/lib/bruno/types';

const BrunoContext = createContext<BrunoContextValue | null>(null);

export function BrunoProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContext, setCurrentContext] =
    useState<BrunoPageContext | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const openBruno = useCallback((context?: BrunoPageContext) => {
    if (context) {
      setCurrentContext(context);
    }
    setIsOpen(true);
  }, []);

  const closeBruno = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleBruno = useCallback((context?: BrunoPageContext) => {
    if (context) {
      setCurrentContext(context);
    }
    setIsOpen((previous) => !previous);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggleBruno();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleBruno]);

  const value = useMemo<BrunoContextValue>(
    () => ({
      isOpen,
      openBruno,
      closeBruno,
      toggleBruno,
      currentContext,
      setCurrentContext,
      activeThreadId,
      setActiveThreadId,
    }),
    [
      activeThreadId,
      closeBruno,
      currentContext,
      isOpen,
      openBruno,
      toggleBruno,
    ]
  );

  return (
    <BrunoContext.Provider value={value}>{children}</BrunoContext.Provider>
  );
}

export function useBruno() {
  const context = useContext(BrunoContext);

  if (!context) {
    throw new Error('useBruno must be used inside BrunoProvider');
  }

  return context;
}

export function useRegisterBrunoContext(context: BrunoPageContext) {
  const { setCurrentContext } = useBruno();
  const { label, page, payload, source } = context;
  const payloadSignature = JSON.stringify(payload ?? null);

  useEffect(() => {
    setCurrentContext({ label, page, payload, source });
    // payload content tracked via payloadSignature to avoid infinite loops from inline object literals
  }, [label, page, payloadSignature, setCurrentContext, source]);
}
