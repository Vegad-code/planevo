import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type BrunoAssistantMode = 'general' | 'planning';

const STORAGE_KEY = 'planevo-bruno-assistant-mode';

function parseBrunoAssistantMode(value: string | null): BrunoAssistantMode {
  return value === 'planning' ? 'planning' : 'general';
}

export function useBrunoAssistantMode() {
  const [assistantMode, setAssistantModeState] =
    useState<BrunoAssistantMode>('general');

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (active && stored) {
          setAssistantModeState(parseBrunoAssistantMode(stored));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setAssistantMode = useCallback((mode: BrunoAssistantMode) => {
    setAssistantModeState(mode);
    SecureStore.setItemAsync(STORAGE_KEY, mode).catch(() => undefined);
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
