'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { isDocumentVisible } from '@/lib/tab-coordination';

function subscribe(callback: () => void) {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}

function getSnapshot() {
  return isDocumentVisible();
}

function getServerSnapshot() {
  return true;
}

export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useOnBecameVisible(callback: () => void): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  const wasVisibleRef = useRef(isDocumentVisible());

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = isDocumentVisible();
      if (visible && !wasVisibleRef.current) {
        callbackRef.current();
      }
      wasVisibleRef.current = visible;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
