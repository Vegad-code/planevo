import { localDateTimeToUtcIso } from "@/lib/bruno/localDateTimeToUtcIso";

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

type ParsedParts = {
  month: number;
  day: number;
  year?: number;
  hour: number;
  minute: number;
};

const ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})?$/i;

const ISO_DATE_TIME_IN_TEXT_PATTERN =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})?/i;

function to24Hour(hour: number, meridiem?: string | null): number {
  if (!meridiem) return hour;
  const normalized = meridiem.toLowerCase();
  if (normalized === "pm" && hour < 12) return hour + 12;
  if (normalized === "am" && hour === 12) return 0;
  return hour;
}

function validDateParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number
) {
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59 ||
    millisecond < 0 ||
    millisecond > 999
  ) {
    return false;
  }

  const normalized = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  );
  return (
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day &&
    normalized.getUTCHours() === hour &&
    normalized.getUTCMinutes() === minute &&
    normalized.getUTCSeconds() === second
  );
}

export function parseIsoDateTimeToUtcIso(
  value: unknown,
  timeZone: string
): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const match = trimmed.match(ISO_DATE_TIME_PATTERN);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  const millisecond = match[7]
    ? Number(match[7].slice(0, 3).padEnd(3, "0"))
    : 0;
  const zone = match[8];

  if (
    !validDateParts(year, month, day, hour, minute, second, millisecond)
  ) {
    return null;
  }

  if (zone) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const localIso = localDateTimeToUtcIso(
    year,
    month,
    day,
    hour,
    minute,
    timeZone
  );
  if (second === 0 && millisecond === 0) return localIso;
  return new Date(
    new Date(localIso).getTime() + second * 1000 + millisecond
  ).toISOString();
}

function inferYear(
  month: number,
  day: number,
  referenceDate: Date,
  timeZone: string
): number {
  const refYear = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
    }).format(referenceDate)
  );

  const candidateIso = localDateTimeToUtcIso(
    refYear,
    month,
    day,
    12,
    0,
    timeZone
  );
  if (new Date(candidateIso).getTime() < referenceDate.getTime() - 86_400_000) {
    return refYear + 1;
  }
  return refYear;
}

function parseMonthDayTime(text: string): ParsedParts | null {
  const monthPattern =
    "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)";

  // Parse the date (month + day [+ year]) independently of the time so that
  // arbitrary words between the date and time (e.g. "july 28 to go to my
  // meeting at 9am") don't prevent a match.
  const dateMatch = text.match(
    new RegExp(
      `${monthPattern}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`,
      "i"
    )
  );
  if (!dateMatch) return null;
  const month = MONTHS[dateMatch[1].toLowerCase()];
  if (!month) return null;
  const day = Number(dateMatch[2]);
  const year = dateMatch[3] ? Number(dateMatch[3]) : undefined;

  // Parse the time independently. Prefer an explicit am/pm time anywhere in the
  // text; otherwise accept an "at <hour>" phrase (defaults to that hour).
  const meridiemTime = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  const atTime = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  let hour: number;
  let minute: number;
  if (meridiemTime) {
    hour = to24Hour(Number(meridiemTime[1]), meridiemTime[3]);
    minute = meridiemTime[2] ? Number(meridiemTime[2]) : 0;
  } else if (atTime) {
    hour = to24Hour(Number(atTime[1]), atTime[3]);
    minute = atTime[2] ? Number(atTime[2]) : 0;
  } else {
    return null;
  }

  return { month, day, year, hour, minute };
}

export function inferEventDateTimeFromText(
  text: string,
  timeZone: string,
  referenceDate: Date = new Date(),
  durationMinutes = 60
): { startTime: string; endTime: string; durationMinutes: number } | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const isoMatch = normalized.match(ISO_DATE_TIME_IN_TEXT_PATTERN);
  if (isoMatch) {
    const startTime = parseIsoDateTimeToUtcIso(isoMatch[0], timeZone);
    if (startTime) {
      const end = new Date(new Date(startTime).getTime() + durationMinutes * 60_000);
      return {
        startTime,
        endTime: end.toISOString(),
        durationMinutes,
      };
    }
  }

  const parsed = parseMonthDayTime(normalized);
  if (!parsed) return null;

  const year =
    parsed.year ?? inferYear(parsed.month, parsed.day, referenceDate, timeZone);
  const startTime = localDateTimeToUtcIso(
    year,
    parsed.month,
    parsed.day,
    parsed.hour,
    parsed.minute,
    timeZone
  );
  const endTime = new Date(
    new Date(startTime).getTime() + durationMinutes * 60_000
  ).toISOString();

  return { startTime, endTime, durationMinutes };
}
