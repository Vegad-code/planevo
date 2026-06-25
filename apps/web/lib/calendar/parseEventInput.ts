import * as chrono from 'chrono-node';
import { format, isToday, isTomorrow, addDays, isSameDay } from 'date-fns';
import type { TaskPriority } from '@/types/tasks';
import {
  cleanupTitle,
  extractDuration,
  extractPriority,
  removeSpans,
  type TextSpan,
} from './nlpExtractors';

export interface ParsedEventInput {
  title: string;
  displayTitle: string;
  startAt?: Date;
  estimatedMinutes?: number;
  priority?: TaskPriority;
  source?: string;
  matchedSpans: TextSpan[];
  chips: string[];
}

const SOURCE_TAG_PATTERN = /#([a-zA-Z0-9_]+)\b/gi;
const PRIORITY_PATTERN = /#(critical|high|medium|low)\b/i;

function formatDateChip(date: Date, refDate: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isSameDay(date, addDays(refDate, 1))) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function formatTimeChip(date: Date): string {
  return format(date, 'h:mm a');
}

function formatDurationChip(minutes: number): string {
  if (minutes % 60 === 0 && minutes >= 60) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${minutes} min`;
}

function refineAmbiguousHour(date: Date, matchedText: string): Date {
  if (/am|pm|a\.m|p\.m/i.test(matchedText)) return date;
  const hours = date.getHours();
  if (hours >= 1 && hours <= 6) {
    const refined = new Date(date);
    refined.setHours(hours + 12);
    return refined;
  }
  return date;
}

function stripSourceTags(working: string): {
  working: string;
  source?: string;
  spans: TextSpan[];
} {
  const spans: TextSpan[] = [];
  let source: string | undefined;
  const regex = new RegExp(SOURCE_TAG_PATTERN.source, 'gi');
  let match = regex.exec(working);
  while (match) {
    if (!PRIORITY_PATTERN.test(match[0])) {
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

export function parseEventInput(
  input: string,
  refDate: Date = new Date()
): ParsedEventInput {
  const displayTitle = input.trim();
  if (!displayTitle) {
    return {
      title: '',
      displayTitle: '',
      matchedSpans: [],
      chips: [],
    };
  }

  const matchedSpans: TextSpan[] = [];
  let working = displayTitle;
  let priority: TaskPriority | undefined;
  let source: string | undefined;
  let estimatedMinutes: number | undefined;
  let startAt: Date | undefined;

  const { priority: p, span: prioritySpan } = extractPriority(working);
  if (p && prioritySpan) {
    priority = p;
    matchedSpans.push(prioritySpan);
    working = removeSpans(working, [prioritySpan]);
  }

  const sourceResult = stripSourceTags(working);
  if (sourceResult.source) source = sourceResult.source;
  matchedSpans.push(...sourceResult.spans);
  working = sourceResult.working;

  const durationMatch = extractDuration(working, []);
  if (durationMatch) {
    estimatedMinutes = durationMatch.minutes;
    matchedSpans.push(durationMatch.span);
    working = removeSpans(working, [durationMatch.span]);
  }

  const chronoResults = chrono.parse(working, refDate, { forwardDate: true });
  if (chronoResults.length > 0) {
    const best = chronoResults[0];
    startAt = refineAmbiguousHour(best.start.date(), best.text);
    const chronoSpans = chronoResults.map((r) => ({
      start: r.index,
      end: r.index + r.text.length,
    }));
    matchedSpans.push(...chronoSpans);
    working = removeSpans(working, chronoSpans);
  }

  const title = cleanupTitle(working);
  const chips: string[] = [];

  if (startAt) {
    chips.push(formatDateChip(startAt, refDate));
    chips.push(formatTimeChip(startAt));
  }
  if (estimatedMinutes) {
    chips.push(formatDurationChip(estimatedMinutes));
  }

  return {
    title,
    displayTitle,
    startAt,
    estimatedMinutes,
    priority,
    source,
    matchedSpans,
    chips,
  };
}
