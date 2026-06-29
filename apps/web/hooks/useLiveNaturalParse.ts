'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface UseLiveNaturalParseOptions<T> {
  rawTitle: string;
  debounceMs?: number;
  enabled: boolean;
  parse: (debouncedTitle: string) => T | null;
  applyParsed: (parsed: T, debouncedTitle: string) => void;
}

export function useLiveNaturalParse<T>({
  rawTitle,
  debounceMs = 250,
  enabled,
  parse,
  applyParsed,
}: UseLiveNaturalParseOptions<T>) {
  const [debouncedTitle, setDebouncedTitle] = useState(rawTitle);
  const [manualFieldsTouched, setManualFieldsTouched] = useState(false);
  const titleAtManualEditRef = useRef(rawTitle);
  const lastAppliedKeyRef = useRef('');
  const applyParsedRef = useRef(applyParsed);

  useEffect(() => {
    applyParsedRef.current = applyParsed;
  }, [applyParsed]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => setDebouncedTitle(rawTitle), debounceMs);
    return () => clearTimeout(timer);
  }, [rawTitle, debounceMs, enabled]);

  useEffect(() => {
    if (manualFieldsTouched && rawTitle !== titleAtManualEditRef.current) {
      setManualFieldsTouched(false);
    }
  }, [rawTitle, manualFieldsTouched]);

  const parsed = useMemo(
    () => (enabled ? parse(debouncedTitle) : null),
    [enabled, debouncedTitle, parse]
  );

  useEffect(() => {
    if (!enabled || !parsed || manualFieldsTouched) return;
    const applyKey = JSON.stringify({ title: debouncedTitle, parsed });
    if (applyKey === lastAppliedKeyRef.current) return;
    lastAppliedKeyRef.current = applyKey;
    applyParsedRef.current(parsed, debouncedTitle);
  }, [parsed, enabled, manualFieldsTouched, debouncedTitle]);

  const markManualFieldEdit = () => {
    setManualFieldsTouched(true);
    titleAtManualEditRef.current = rawTitle;
  };

  return {
    parsed,
    debouncedTitle,
    manualFieldsTouched,
    markManualFieldEdit,
  };
}
