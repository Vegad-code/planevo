'use client';

import { useEffect, useMemo, useRef } from 'react';
import { addMinutes, format, isValid } from 'date-fns';
import {
  parseEventInput,
  type ParsedEventInput,
} from '@/lib/calendar/parseEventInput';
import { useLiveNaturalParse } from '@/hooks/useLiveNaturalParse';

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
  smartSchedulingEnabled?: boolean;
  callbacks: LiveEventParseCallbacks;
}

export function useLiveEventParse({
  rawTitle,
  refDate,
  debounceMs = 250,
  enabled,
  smartSchedulingEnabled = true,
  callbacks,
}: UseLiveEventParseOptions) {
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const parse = useMemo(
    () => (title: string) =>
      title.trim()
        ? parseEventInput(title, refDate)
        : null,
    [refDate]
  );

  const applyParsed = useMemo(
    () => (parsed: ParsedEventInput) => {
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
          setEndTimeStr(
            toTimeInputValue(addMinutes(start, parsed.estimatedMinutes))
          );
        }
      }
    },
    []
  );

  const { parsed, markManualFieldEdit } = useLiveNaturalParse({
    rawTitle,
    debounceMs,
    enabled: enabled && smartSchedulingEnabled,
    parse,
    applyParsed,
  });

  return {
    parsed: parsed as ParsedEventInput | null,
    chips: parsed?.chips ?? [],
    markManualFieldEdit,
  };
}
