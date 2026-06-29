import type { DurationMatch, RecurrenceMatch, TaskPriority, TextSpan } from './types';

const PRIORITY_HASH_PATTERN = /#(critical|high|medium|low)\b/i;
const P1_P4_PATTERN = /\bp([1-4])\b/i;
const SOURCE_TAG_PATTERN = /#([a-zA-Z0-9_]+)\b/gi;
const DUE_CUE_PATTERN = /\b(due|by|before|deadline)\b/i;
const BACKLOG_PATTERN = /\bbacklog\b/i;

const PROTECTED_RECURRENCE_WORDS = /\b(monthly|daily|weekly)\b/i;

const DAY_TO_RRULE: Record<string, string> = {
  sunday: 'SU',
  monday: 'MO',
  tuesday: 'TU',
  wednesday: 'WE',
  thursday: 'TH',
  friday: 'FR',
  saturday: 'SA',
};

const DURATION_PATTERNS: {
  regex: RegExp;
  resolve: (match: RegExpMatchArray) => number | null;
}[] = [
  {
    regex: /\bhalf\s+an?\s+hour\b/i,
    resolve: () => 30,
  },
  {
    regex: /\bfor an hour\b/i,
    resolve: () => 60,
  },
  {
    regex: /\ban hour\b/i,
    resolve: () => 60,
  },
  {
    regex: /~(\d+)\s*(m|min|mins|minutes)\b/i,
    resolve: (m) => parseInt(m[1], 10),
  },
  {
    regex:
      /(?:\b(?:for|in|takes)\s+)(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/i,
    resolve: (m) => Math.round(parseFloat(m[1]) * 60),
  },
  {
    regex: /(?:\b(?:for|in|takes)\s+)(\d+)\s*(m|min|mins|minutes)\b/i,
    resolve: (m) => parseInt(m[1], 10),
  },
  {
    regex: /\b(\d+)h\s*(\d+)\s*m\b/i,
    resolve: (m) => parseInt(m[1], 10) * 60 + parseInt(m[2], 10),
  },
  {
    regex:
      /\bfor\s+(\d{2,3})\b(?!\s*(?:m|min|mins|minutes|h|hr|hrs|hours|am|pm)\b)/i,
    resolve: (m) => {
      const value = parseInt(m[1], 10);
      if (value >= 15 && value <= 480) return value;
      return null;
    },
  },
];

function spansOverlap(a: TextSpan, b: TextSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

const P1_TO_PRIORITY: Record<string, TaskPriority> = {
  '1': 'critical',
  '2': 'high',
  '3': 'medium',
  '4': 'low',
};

export function extractPriority(
  input: string
): { priority?: TaskPriority; span?: TextSpan; confidence: number } {
  const hashMatch = input.match(PRIORITY_HASH_PATTERN);
  if (hashMatch && hashMatch.index !== undefined) {
    return {
      priority: hashMatch[1].toLowerCase() as TaskPriority,
      span: { start: hashMatch.index, end: hashMatch.index + hashMatch[0].length },
      confidence: 0.95,
    };
  }

  const pMatch = input.match(P1_P4_PATTERN);
  if (pMatch && pMatch.index !== undefined) {
    return {
      priority: P1_TO_PRIORITY[pMatch[1]],
      span: { start: pMatch.index, end: pMatch.index + pMatch[0].length },
      confidence: 0.9,
    };
  }

  return { confidence: 0 };
}

export function extractDueCue(
  input: string
): { hasDueCue: boolean; span?: TextSpan; confidence: number } {
  const match = input.match(DUE_CUE_PATTERN);
  if (!match || match.index === undefined) {
    return { hasDueCue: false, confidence: 0 };
  }
  return {
    hasDueCue: true,
    span: { start: match.index, end: match.index + match[0].length },
    confidence: 0.85,
  };
}

export function extractBacklog(
  input: string
): { isBacklog: boolean; span?: TextSpan; confidence: number } {
  const match = input.match(BACKLOG_PATTERN);
  if (!match || match.index === undefined) {
    return { isBacklog: false, confidence: 0 };
  }
  return {
    isBacklog: true,
    span: { start: match.index, end: match.index + match[0].length },
    confidence: 0.9,
  };
}

export function extractSourceTags(working: string): {
  working: string;
  source?: string;
  spans: TextSpan[];
} {
  const spans: TextSpan[] = [];
  let source: string | undefined;
  const regex = new RegExp(SOURCE_TAG_PATTERN.source, 'gi');
  let match = regex.exec(working);
  while (match) {
    if (!PRIORITY_HASH_PATTERN.test(match[0])) {
      if (!source) source = match[1];
      spans.push({ start: match.index, end: match.index + match[0].length });
    }
    match = regex.exec(working);
  }
  return {
    working: spans.length ? removeSpans(working, spans) : working,
    source,
    spans,
  };
}

export function extractDuration(
  input: string,
  excludeSpans: TextSpan[] = []
): DurationMatch | null {
  for (const { regex, resolve } of DURATION_PATTERNS) {
    const match = input.match(regex);
    if (!match || match.index === undefined) continue;
    const span = { start: match.index, end: match.index + match[0].length };
    if (excludeSpans.some((s) => spansOverlap(s, span))) continue;
    const minutes = resolve(match);
    if (minutes != null && minutes > 0) {
      return { minutes, span, confidence: 0.88 };
    }
  }
  return null;
}

export function extractRecurrence(
  input: string,
  excludeSpans: TextSpan[] = []
): RecurrenceMatch | null {
  const patterns: {
    regex: RegExp;
    resolve: (match: RegExpMatchArray) => { rrule: string; label: string } | null;
    confidence: number;
  }[] = [
    {
      regex: /\bevery\s+other\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      resolve: (m) => {
        const day = DAY_TO_RRULE[m[1].toLowerCase()];
        return day
          ? { rrule: `FREQ=WEEKLY;INTERVAL=2;BYDAY=${day}`, label: `Every other ${m[1]}` }
          : null;
      },
      confidence: 0.9,
    },
    {
      regex:
        /\bevery\s+(?:\d+(?:st|nd|rd|th)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      resolve: (m) => {
        const day = DAY_TO_RRULE[m[1].toLowerCase()];
        return day
          ? { rrule: `FREQ=WEEKLY;BYDAY=${day}`, label: `Every ${m[1]}` }
          : null;
      },
      confidence: 0.9,
    },
    {
      regex: /\bevery\s+other\s+week\b/i,
      resolve: () => ({
        rrule: 'FREQ=WEEKLY;INTERVAL=2',
        label: 'Every other week',
      }),
      confidence: 0.88,
    },
    {
      regex: /\b(?:every\s+day|daily)\b/i,
      resolve: () => ({ rrule: 'FREQ=DAILY', label: 'Daily' }),
      confidence: 0.88,
    },
    {
      regex: /\b(?:every\s+week|weekly)\b/i,
      resolve: () => ({ rrule: 'FREQ=WEEKLY', label: 'Weekly' }),
      confidence: 0.75,
    },
    {
      regex: /\b(?:every\s+month|monthly)\b/i,
      resolve: () => ({ rrule: 'FREQ=MONTHLY', label: 'Monthly' }),
      confidence: 0.75,
    },
  ];

  for (const { regex, resolve, confidence } of patterns) {
    const match = input.match(regex);
    if (!match || match.index === undefined) continue;
    const span = { start: match.index, end: match.index + match[0].length };
    if (excludeSpans.some((s) => spansOverlap(s, span))) continue;

    if (PROTECTED_RECURRENCE_WORDS.test(match[0]) && !/\bevery\b/i.test(match[0])) {
      continue;
    }

    const resolved = resolve(match);
    if (resolved) {
      return { ...resolved, span, confidence };
    }
  }

  return null;
}

export function shouldSkipChronoForTitle(title: string): boolean {
  if (title.length < 8) return false;
  const bareNumber = /\b\d{2,3}\b/;
  if (!bareNumber.test(title)) return false;
  if (
    /\b(at|by|on|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next|in)\b/i.test(
      title
    )
  ) {
    return false;
  }
  if (/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(title)) return false;
  return title.split(/\s+/).length > 6;
}

export function removeSpans(input: string, spans: TextSpan[]): string {
  const unique = spans.filter(
    (span, i, arr) =>
      arr.findIndex((s) => s.start === span.start && s.end === span.end) === i
  );
  const sorted = [...unique].sort((a, b) => b.start - a.start);
  let result = input;
  for (const span of sorted) {
    result = result.slice(0, span.start) + ' ' + result.slice(span.end);
  }
  return cleanupTitle(result);
}

export function cleanupTitle(title: string): string {
  return title
    .replace(/\b(?:at|by|on|for|in)\s*$/i, '')
    .replace(/^(?:at|by|on|for|in)\s+/i, '')
    .replace(/\s([.,!?;:])\s*/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function computeDateConfidence(matchedText: string, resultCount: number): number {
  let confidence = 0.65;
  if (/am|pm|a\.m|p\.m/i.test(matchedText)) confidence += 0.25;
  if (/\b(today|tomorrow|tonight|tmr|tmrw)\b/i.test(matchedText)) confidence += 0.15;
  if (resultCount > 1) confidence -= 0.2;
  return Math.max(0, Math.min(1, confidence));
}
