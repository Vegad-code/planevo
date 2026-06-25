'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addMinutes, format, isValid } from 'date-fns';
import {
  parseEventInput,
  type ParsedEventInput,
} from '@/lib/calendar/parseEventInput';

function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function toTimeInputValue(date: Date): string {
  return format(date, 'HH:mm');
}

function roundToQuarterHour(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  rounded.setMinutes(Math.round(minutes / 15) * 15, 0, 0);
  return rounded;
}

export interface LiveEventParseCallbacks {
  setDateStr: (value: string) => void;
  setStartTimeStr: (value: string) => void;
  setEndTimeStr: (value: string) => void;
  getStartDate: () => Date;
}

export interface UseLiveEventParseOptions {
  rawTitle: string;
  refDate: Date;
  debounceMs?: number;
  enabled: boolean;
  callbacks: LiveEventParseCallbacks;
}

export function useLiveEventParse({
  rawTitle,
  refDate,
  debounceMs = 250,
  enabled,
  callbacks,
}: UseLiveEventParseOptions) {
  const [debouncedTitle, setDebouncedTitle] = useState(rawTitle);
  const [manualFieldsTouched, setManualFieldsTouched] = useState(false);
  const titleAtManualEditRef = useRef(rawTitle);
  const lastAppliedKeyRef = useRef('');
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

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
    () => (enabled ? parseEventInput(debouncedTitle, refDate) : null),
    [debouncedTitle, refDate, enabled]
  );

  useEffect(() => {
    if (!enabled || !parsed || manualFieldsTouched) return;

    const applyKey = JSON.stringify({
      title: debouncedTitle,
      start: parsed.startAt?.toISOString(),
      mins: parsed.estimatedMinutes,
    });
    if (applyKey === lastAppliedKeyRef.current) return;
    lastAppliedKeyRef.current = applyKey;

    const { setDateStr, setStartTimeStr, setEndTimeStr, getStartDate } =
      callbacksRef.current;

    if (parsed.startAt && isValid(parsed.startAt)) {
      const startAt = roundToQuarterHour(parsed.startAt);
      setDateStr(toDateInputValue(startAt));
      setStartTimeStr(toTimeInputValue(startAt));
      const durationMins = parsed.estimatedMinutes ?? 60;
      setEndTimeStr(toTimeInputValue(addMinutes(startAt, durationMins)));
      return;
    }

    if (parsed.estimatedMinutes) {
      const start = getStartDate();
      if (isValid(start)) {
        setEndTimeStr(toTimeInputValue(addMinutes(start, parsed.estimatedMinutes)));
      }
    }
  }, [parsed, enabled, manualFieldsTouched, debouncedTitle, refDate]);

  const markManualFieldEdit = () => {
    setManualFieldsTouched(true);
    titleAtManualEditRef.current = rawTitle;
  };

  return {
    parsed: parsed as ParsedEventInput | null,
    chips: parsed?.chips ?? [],
    markManualFieldEdit,
  };
}
