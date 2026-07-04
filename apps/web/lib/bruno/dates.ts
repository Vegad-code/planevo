import { localDateTimeToUtcIso } from '@/lib/bruno/localDateTimeToUtcIso';
import { inferEventDateTimeFromText } from '@/lib/bruno/inferEventDateTime';

export type LocalDateParts = { year: number; month: number; day: number };

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function localDateFromReference(
  referenceDate: Date,
  timeZone: string
): LocalDateParts {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate);
  const [year, month, day] = formatted.split('-').map(Number);
  return { year, month, day };
}

export function addDays(date: LocalDateParts, days: number): LocalDateParts {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days, 12)
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function weekdayFor(date: LocalDateParts): number {
  return new Date(
    Date.UTC(date.year, date.month - 1, date.day, 12)
  ).getUTCDay();
}

function resolveWeekday(
  weekday: number,
  qualifier: string | undefined,
  reference: LocalDateParts
): LocalDateParts {
  const currentDow = weekdayFor(reference);
  if (qualifier === 'next') {
    const rawOffset = (weekday - currentDow + 7) % 7;
    return addDays(reference, rawOffset === 0 ? 7 : rawOffset);
  }
  // "this Friday" and bare "Friday" both mean the upcoming occurrence
  // (today counts if the weekday matches).
  const offset = (weekday - currentDow + 7) % 7;
  return addDays(reference, offset);
}

/**
 * Resolve a relative or explicit date expression ("tomorrow", "next tuesday",
 * "july 28", "7/28", "2026-07-28") to local date parts in the user's timezone.
 */
export function resolveRelativeDate(
  text: string,
  referenceDate: Date,
  timeZone: string
): LocalDateParts | null {
  const normalized = text.toLowerCase();
  const reference = localDateFromReference(referenceDate, timeZone);

  if (/\btoday\b|\btonight\b|\bthis (?:morning|afternoon|evening)\b/.test(normalized)) {
    return reference;
  }
  if (/\btomorrow\b/.test(normalized)) return addDays(reference, 1);
  if (/\bday after tomorrow\b/.test(normalized)) return addDays(reference, 2);
  if (/\bnext week\b/.test(normalized)) {
    return resolveWeekday(1, 'next', reference);
  }

  const weekday = normalized.match(
    /\b(?:(this|next)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  );
  if (weekday) {
    return resolveWeekday(WEEKDAYS[weekday[2]], weekday[1], reference);
  }

  return null;
}

type TimeParts = { hour: number; minute: number };

function to24Hour(hour: number, meridiem?: string | null): number {
  if (!meridiem) return hour;
  const normalized = meridiem.toLowerCase();
  if (normalized === 'pm' && hour < 12) return hour + 12;
  if (normalized === 'am' && hour === 12) return 0;
  return hour;
}

function resolveTimeOfDay(text: string): TimeParts | null {
  const normalized = text.toLowerCase();

  const meridiemTime = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (meridiemTime) {
    return {
      hour: to24Hour(Number(meridiemTime[1]), meridiemTime[3]),
      minute: meridiemTime[2] ? Number(meridiemTime[2]) : 0,
    };
  }

  const atTime = normalized.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/);
  if (atTime) {
    const hour = Number(atTime[1]);
    // Bare "at 3" without meridiem: hours 1-7 almost always mean afternoon
    // or evening in planning conversations.
    return {
      hour: hour >= 1 && hour <= 7 ? hour + 12 : hour,
      minute: atTime[2] ? Number(atTime[2]) : 0,
    };
  }

  if (/\bnoon\b|\bmidday\b/.test(normalized)) return { hour: 12, minute: 0 };
  if (/\bmidnight\b/.test(normalized)) return { hour: 0, minute: 0 };
  if (/\btonight\b|\bevening\b/.test(normalized)) return { hour: 19, minute: 0 };
  if (/\bafternoon\b/.test(normalized)) return { hour: 14, minute: 0 };
  if (/\bmorning\b/.test(normalized)) return { hour: 9, minute: 0 };

  return null;
}

export type InferredDateTime = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

/**
 * One date parser for the whole propose/execute path. Handles everything
 * inferEventDateTimeFromText does (ISO-in-text, "July 28 at 9am") plus
 * relative expressions like "tomorrow at 3pm", "next tuesday morning",
 * and "tonight". A resolved date without an explicit time defaults to 9am
 * local so a user-confirmed proposal never dead-ends at execute time.
 */
export function inferFlexibleEventDateTime(
  text: string,
  timeZone: string,
  referenceDate: Date = new Date(),
  durationMinutes = 60
): InferredDateTime | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  const explicit = inferEventDateTimeFromText(
    normalized,
    timeZone,
    referenceDate,
    durationMinutes
  );
  if (explicit) return explicit;

  const date = resolveRelativeDate(normalized, referenceDate, timeZone);
  if (!date) return null;

  const time = resolveTimeOfDay(normalized) ?? { hour: 9, minute: 0 };
  const startTime = localDateTimeToUtcIso(
    date.year,
    date.month,
    date.day,
    time.hour,
    time.minute,
    timeZone
  );
  const endTime = new Date(
    new Date(startTime).getTime() + durationMinutes * 60_000
  ).toISOString();

  return { startTime, endTime, durationMinutes };
}
