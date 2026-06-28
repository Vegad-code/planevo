'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BRUNO_ASSISTANT_MODE_STORAGE_KEY,
  parseBrunoAssistantMode,
} from '@/lib/bruno/assistantMode';
import type { BrunoAssistantMode } from '@/lib/bruno/types';

function readStoredAssistantMode(): BrunoAssistantMode {
  if (typeof window === 'undefined') return 'general';
  const stored = window.localStorage.getItem(BRUNO_ASSISTANT_MODE_STORAGE_KEY);
  return parseBrunoAssistantMode(stored);
}

export function useBrunoAssistantMode() {
  const [assistantMode, setAssistantModeState] =
    useState<BrunoAssistantMode>('general');

  useEffect(() => {
    setAssistantModeState(readStoredAssistantMode());
  }, []);

  const setAssistantMode = useCallback((mode: BrunoAssistantMode) => {
    setAssistantModeState(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BRUNO_ASSISTANT_MODE_STORAGE_KEY, mode);
    }
  }, []);

  const togglePlanningMode = useCallback(() => {
    setAssistantMode(assistantMode === 'planning' ? 'general' : 'planning');
  }, [assistantMode, setAssistantMode]);

  return {
    assistantMode,
    setAssistantMode,
    togglePlanningMode,
    isPlanningMode: assistantMode === 'planning',
  };
}
