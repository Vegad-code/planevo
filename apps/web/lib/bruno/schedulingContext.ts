import type { BrunoPageContext } from '@/lib/bruno/types';
import { startOfMonth, startOfWeek } from 'date-fns';
import { localDateTimeToUtcIso } from '@/lib/bruno/localDateTimeToUtcIso';

const CALENDAR_WEEK_STARTS_ON = 0 as const;

export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

/** Prefer the browser timezone so Bruno matches the calendar UI. */
export function resolveBrunoTimeZone(input: {
  clientTimeZone?: string;
  profilePreferences?: Record<string, unknown> | null;
}): string {
  if (input.clientTimeZone && input.clientTimeZone.trim().length > 0) {
    return input.clientTimeZone;
  }
  const profileTz = input.profilePreferences?.timezone;
  if (typeof profileTz === 'string' && profileTz.trim().length > 0) {
    return profileTz;
  }
  return 'UTC';
}

/** Anchor scheduling to the visible calendar period, not an arbitrary selected cell. */
export function resolveBrunoReferenceDate(input: {
  localTime?: string;
  pageContext?: BrunoPageContext;
}): Date {
  if (input.pageContext?.source === 'calendar') {
    const payload = input.pageContext.payload;
    const activeView = payload?.activeView;

    if (activeView === 'month' || activeView === 'year') {
      const monthStart = payload?.monthStart;
      if (typeof monthStart === 'string') {
        const parsed = new Date(monthStart);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      const selectedDate = payload?.selectedDate;
      if (typeof selectedDate === 'string') {
        const parsed = new Date(selectedDate);
        if (!Number.isNaN(parsed.getTime())) return startOfMonth(parsed);
      }
    }

    if (activeView === 'week') {
      const weekStart = payload?.weekStart;
      if (typeof weekStart === 'string') {
        const parsed = new Date(weekStart);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      const selectedDate = payload?.selectedDate;
      if (typeof selectedDate === 'string') {
        const parsed = new Date(selectedDate);
        if (!Number.isNaN(parsed.getTime())) {
          return startOfWeek(parsed, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
        }
      }
    }

    const selectedDate = payload?.selectedDate;
    if (typeof selectedDate === 'string') {
      const parsed = new Date(selectedDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  if (input.localTime) {
    const parsed = new Date(input.localTime);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

export function localDateFromIsoInTimeZone(iso: string, timeZone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));

  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return { year: read('year'), month: read('month'), day: read('day') };
}

export function addLocalDays(date: LocalDateParts, days: number): LocalDateParts {
  const base = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

/** Inclusive local-day window converted to UTC for DB queries. */
export function calendarDayBounds(
  date: LocalDateParts,
  timeZone: string
): { start: string; end: string } {
  const nextDate = addLocalDays(date, 1);
  return {
    start: localDateTimeToUtcIso(date.year, date.month, date.day, 0, 0, timeZone),
    end: localDateTimeToUtcIso(nextDate.year, nextDate.month, nextDate.day, 0, 0, timeZone),
  };
}

export function calendarDayBoundsFromDateKey(
  dateKey: string,
  timeZone: string
): { start: string; end: string } {
  const [year, month, day] = dateKey.split('-').map(Number);
  return calendarDayBounds({ year, month, day }, timeZone);
}
