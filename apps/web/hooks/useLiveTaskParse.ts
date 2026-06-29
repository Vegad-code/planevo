'use client';

import { useCallback, useMemo } from 'react';
import { parseTaskInput, type ParsedTask } from '@/lib/taskParser';
import { useLiveNaturalParse } from '@/hooks/useLiveNaturalParse';

export type QuickDuePill = 'today' | 'tomorrow' | 'none';

export interface LiveTaskParseCallbacks {
  setDueDatePill: (value: QuickDuePill) => void;
  setDuration: (value: number) => void;
  setPriority: (value: ParsedTask['priority']) => void;
  setIsRecurring?: (value: boolean) => void;
  setRecurrencePattern?: (value: string) => void;
}

export interface UseLiveTaskParseOptions {
  rawTitle: string;
  refDate: Date;
  debounceMs?: number;
  enabled: boolean;
  smartSchedulingEnabled?: boolean;
  callbacks: LiveTaskParseCallbacks;
}

function pillFromDueDate(dueDate?: string, refDate: Date = new Date()): QuickDuePill {
  if (!dueDate) return 'none';
  const due = dueDate.length === 10 ? new Date(`${dueDate}T12:00:00`) : new Date(dueDate);
  const today = new Date(refDate);
  today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDay = new Date(due);
  dueDay.setHours(12, 0, 0, 0);
  if (dueDay.getTime() === today.getTime()) return 'today';
  if (dueDay.getTime() === tomorrow.getTime()) return 'tomorrow';
  return 'none';
}

function nearestDurationPill(minutes: number): 15 | 30 | 60 {
  const options = [15, 30, 60] as const;
  return options.reduce((best, option) =>
    Math.abs(option - minutes) < Math.abs(best - minutes) ? option : best
  );
}

export function useLiveTaskParse({
  rawTitle,
  refDate,
  debounceMs = 250,
  enabled,
  smartSchedulingEnabled = true,
  callbacks,
}: UseLiveTaskParseOptions) {
  const parse = useCallback(
    (title: string) =>
      title.trim()
        ? parseTaskInput(title, refDate, { smartSchedulingEnabled })
        : null,
    [refDate, smartSchedulingEnabled]
  );

  const applyParsed = useCallback(
    (parsed: ParsedTask) => {
      if (parsed.isBacklog) {
        callbacks.setDueDatePill('none');
      } else if (parsed.dueDate) {
        callbacks.setDueDatePill(pillFromDueDate(parsed.dueDate, refDate));
      }

      if (parsed.estimatedMinutes) {
        callbacks.setDuration(nearestDurationPill(parsed.estimatedMinutes));
      }

      if (parsed.priority) {
        callbacks.setPriority(parsed.priority);
      }

      if (parsed.isRecurring && parsed.recurrencePattern) {
        callbacks.setIsRecurring?.(true);
        callbacks.setRecurrencePattern?.(parsed.recurrencePattern);
      }
    },
    [callbacks, refDate]
  );

  const { parsed, markManualFieldEdit } = useLiveNaturalParse({
    rawTitle,
    debounceMs,
    enabled,
    parse,
    applyParsed,
  });

  const chips = useMemo(() => parsed?.chips ?? [], [parsed]);

  return {
    parsed,
    chips,
    markManualFieldEdit,
  };
}

export interface MergeTaskParseOptions {
  parsed: ParsedTask;
  dueDatePill: QuickDuePill;
  durationPill: number;
  priorityOverride?: ParsedTask['priority'] | null;
  dueDateOverride?: string | null;
  durationOverride?: number | null;
  userTouchedDuePill: boolean;
  userTouchedDurationPill: boolean;
  userTouchedPriority?: boolean;
}

export function mergeTaskParseWithOverrides(options: MergeTaskParseOptions): ParsedTask {
  const {
    parsed,
    dueDatePill,
    durationPill,
    priorityOverride,
    dueDateOverride,
    durationOverride,
    userTouchedDuePill,
    userTouchedDurationPill,
    userTouchedPriority,
  } = options;

  let dueDate = parsed.dueDate;
  if (userTouchedDuePill) {
    if (dueDatePill === 'none') {
      dueDate = undefined;
    } else {
      const d = new Date();
      if (dueDatePill === 'tomorrow') d.setDate(d.getDate() + 1);
      dueDate = d.toISOString().split('T')[0];
    }
  }

  if (dueDateOverride) dueDate = dueDateOverride;

  let estimatedMinutes = parsed.estimatedMinutes;
  if (userTouchedDurationPill) {
    estimatedMinutes = durationPill;
  }
  if (durationOverride != null) {
    estimatedMinutes = durationOverride;
  }

  let priority = parsed.priority;
  if (userTouchedPriority && priorityOverride) {
    priority = priorityOverride;
  } else if (priorityOverride) {
    priority = priorityOverride;
  }

  return {
    ...parsed,
    dueDate,
    priority,
    estimatedMinutes,
    isBacklog: userTouchedDuePill && dueDatePill === 'none' ? true : parsed.isBacklog,
  };
}
