import type { TaskPriority } from '@/types/tasks';

export interface TextSpan {
  start: number;
  end: number;
}

export interface DurationMatch {
  minutes: number;
  span: TextSpan;
}

const PRIORITY_PATTERN = /#(critical|high|medium|low)\b/i;
const SOURCE_TAG_PATTERN = /#([a-zA-Z0-9_]+)\b/;

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
    regex: /(?:\b(?:for|in|takes)\s+)(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/i,
    resolve: (m) => Math.round(parseFloat(m[1]) * 60),
  },
  {
    regex: /(?:\b(?:for|in|takes)\s+)(\d+)\s*(m|min|mins|minutes)\b/i,
    resolve: (m) => parseInt(m[1], 10),
  },
  {
    regex: /\bfor\s+(\d{2,3})\b(?!\s*(?:m|min|mins|minutes|h|hr|hrs|hours|am|pm)\b)/i,
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

export function extractPriority(
  input: string
): { priority?: TaskPriority; span?: TextSpan } {
  const match = input.match(PRIORITY_PATTERN);
  if (!match || match.index === undefined) return {};
  return {
    priority: match[1].toLowerCase() as TaskPriority,
    span: { start: match.index, end: match.index + match[0].length },
  };
}

export function extractSourceTag(
  input: string,
  excludeSpans: TextSpan[] = []
): { source?: string; span?: TextSpan } {
  const match = input.match(SOURCE_TAG_PATTERN);
  if (!match || match.index === undefined) return {};
  const span = { start: match.index, end: match.index + match[0].length };
  if (excludeSpans.some((s) => spansOverlap(s, span))) return {};
  if (PRIORITY_PATTERN.test(match[0])) return {};
  return { source: match[1], span };
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
      return { minutes, span };
    }
  }
  return null;
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
