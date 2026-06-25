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

function to24Hour(hour: number, meridiem?: string | null): number {
  if (!meridiem) return hour;
  const normalized = meridiem.toLowerCase();
  if (normalized === "pm" && hour < 12) return hour + 12;
  if (normalized === "am" && hour === 12) return 0;
  return hour;
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

  const monthFirst = new RegExp(
    `${monthPattern}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\s+(?:at\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?`,
    "i"
  );
  const timeFirst = new RegExp(
    `(?:at\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)\\s+(?:on\\s+)?${monthPattern}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`,
    "i"
  );

  const monthFirstMatch = text.match(monthFirst);
  if (monthFirstMatch) {
    const month = MONTHS[monthFirstMatch[1].toLowerCase()];
    if (!month) return null;
    return {
      month,
      day: Number(monthFirstMatch[2]),
      year: monthFirstMatch[3] ? Number(monthFirstMatch[3]) : undefined,
      hour: to24Hour(Number(monthFirstMatch[4]), monthFirstMatch[6]),
      minute: monthFirstMatch[5] ? Number(monthFirstMatch[5]) : 0,
    };
  }

  const timeFirstMatch = text.match(timeFirst);
  if (timeFirstMatch) {
    const month = MONTHS[timeFirstMatch[4].toLowerCase()];
    if (!month) return null;
    return {
      month,
      day: Number(timeFirstMatch[5]),
      year: timeFirstMatch[6] ? Number(timeFirstMatch[6]) : undefined,
      hour: to24Hour(Number(timeFirstMatch[1]), timeFirstMatch[3]),
      minute: timeFirstMatch[2] ? Number(timeFirstMatch[2]) : 0,
    };
  }

  return null;
}

export function inferEventDateTimeFromText(
  text: string,
  timeZone: string,
  referenceDate: Date = new Date(),
  durationMinutes = 60
): { startTime: string; endTime: string; durationMinutes: number } | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const isoMatch = normalized.match(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/
  );
  if (isoMatch) {
    const start = new Date(isoMatch[0]);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      return {
        startTime: start.toISOString(),
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
