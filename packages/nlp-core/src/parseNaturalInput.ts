import * as chrono from 'chrono-node';
import { format, isToday, isTomorrow, addDays, isSameDay } from 'date-fns';
import {
  cleanupTitle,
  computeDateConfidence,
  extractBacklog,
  extractDueCue,
  extractDuration,
  extractPriority,
  extractRecurrence,
  extractSourceTags,
  removeSpans,
  shouldSkipChronoForTitle,
} from './nlpExtractors';
import type { EntityKind, ParsedEntity, ParseContext, TaskPriority, TextSpan } from './types';

export interface ParsedNaturalInput {
  title: string;
  displayTitle: string;
  startAt?: Date;
  estimatedMinutes?: number;
  priority?: TaskPriority;
  source?: string;
  recurrencePattern?: string;
  recurrenceLabel?: string;
  isBacklog?: boolean;
  hasDueCue?: boolean;
  dateOnly?: boolean;
  matchedSpans: TextSpan[];
  chips: string[];
  entities: ParsedEntity[];
  confidence: number;
}

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

function hasTimeComponent(date: Date): boolean {
  return date.getHours() !== 0 || date.getMinutes() !== 0;
}

export function parseNaturalInput(
  input: string,
  refDate: Date = new Date(),
  context: ParseContext = { refDate }
): ParsedNaturalInput {
  const displayTitle = input.trim();
  if (!displayTitle) {
    return {
      title: '',
      displayTitle: '',
      matchedSpans: [],
      chips: [],
      entities: [],
      confidence: 0,
    };
  }

  if (context.smartSchedulingEnabled === false) {
    return {
      title: displayTitle,
      displayTitle,
      matchedSpans: [],
      chips: [],
      entities: [],
      confidence: 1,
    };
  }

  const matchedSpans: TextSpan[] = [];
  const entities: ParsedEntity[] = [];
  let working = displayTitle;
  let priority: TaskPriority | undefined;
  let source: string | undefined;
  let estimatedMinutes: number | undefined;
  let startAt: Date | undefined;
  let recurrencePattern: string | undefined;
  let recurrenceLabel: string | undefined;
  let isBacklog = false;
  let hasDueCue = false;
  let dateConfidence = 0;

  const {
    priority: p,
    span: prioritySpan,
    confidence: priorityConfidence,
  } = extractPriority(working);
  if (p && prioritySpan) {
    priority = p;
    matchedSpans.push(prioritySpan);
    entities.push({
      kind: 'priority',
      span: prioritySpan,
      confidence: priorityConfidence,
      value: p,
    });
    working = removeSpans(working, [prioritySpan]);
  }

  const sourceResult = extractSourceTags(working);
  if (sourceResult.source) source = sourceResult.source;
  for (const span of sourceResult.spans) {
    matchedSpans.push(span);
    entities.push({ kind: 'tag', span, confidence: 0.9, value: sourceResult.source });
  }
  working = sourceResult.working;

  const backlogResult = extractBacklog(working);
  if (backlogResult.isBacklog && backlogResult.span) {
    isBacklog = true;
    matchedSpans.push(backlogResult.span);
    entities.push({
      kind: 'backlog',
      span: backlogResult.span,
      confidence: backlogResult.confidence,
      value: true,
    });
    working = removeSpans(working, [backlogResult.span]);
  }

  const dueCueResult = extractDueCue(working);
  if (dueCueResult.hasDueCue && dueCueResult.span) {
    hasDueCue = true;
    matchedSpans.push(dueCueResult.span);
    entities.push({
      kind: 'dueCue',
      span: dueCueResult.span,
      confidence: dueCueResult.confidence,
      value: true,
    });
    working = removeSpans(working, [dueCueResult.span]);
  }

  const recurrenceMatch = extractRecurrence(working, matchedSpans);
  if (recurrenceMatch) {
    recurrencePattern = recurrenceMatch.rrule;
    recurrenceLabel = recurrenceMatch.label;
    matchedSpans.push(recurrenceMatch.span);
    entities.push({
      kind: 'recurrence',
      span: recurrenceMatch.span,
      confidence: recurrenceMatch.confidence,
      value: recurrenceMatch.rrule,
    });
    working = removeSpans(working, [recurrenceMatch.span]);
  }

  const durationMatch = extractDuration(working, matchedSpans);
  if (durationMatch) {
    estimatedMinutes = durationMatch.minutes;
    matchedSpans.push(durationMatch.span);
    entities.push({
      kind: 'duration',
      span: durationMatch.span,
      confidence: durationMatch.confidence,
      value: durationMatch.minutes,
    });
    working = removeSpans(working, [durationMatch.span]);
  }

  if (!shouldSkipChronoForTitle(working)) {
    const chronoResults = chrono.parse(working, refDate, { forwardDate: true });
    if (chronoResults.length > 0) {
      const best = chronoResults[0];
      startAt = refineAmbiguousHour(best.start.date(), best.text);
      dateConfidence = computeDateConfidence(best.text, chronoResults.length);
      const chronoSpans = chronoResults.map((r) => ({
        start: r.index,
        end: r.index + r.text.length,
      }));
      matchedSpans.push(...chronoSpans);
      for (const span of chronoSpans) {
        entities.push({
          kind: 'datetime',
          span,
          confidence: dateConfidence,
          value: startAt,
        });
      }
      working = removeSpans(working, chronoSpans);
    }
  }

  const title = cleanupTitle(working);
  const chips: string[] = [];

  if (isBacklog) chips.push('Backlog');
  if (recurrenceLabel) chips.push(recurrenceLabel);
  if (startAt && dateConfidence >= 0.5) {
    chips.push(formatDateChip(startAt, refDate));
    if (hasTimeComponent(startAt) && !hasDueCue) {
      chips.push(formatTimeChip(startAt));
    }
  }
  if (estimatedMinutes) {
    chips.push(formatDurationChip(estimatedMinutes));
  }
  if (priority) {
    chips.push(priority);
  }

  const entityConfidences = entities.map((e) => e.confidence);
  const confidence =
    entityConfidences.length > 0
      ? entityConfidences.reduce((a, b) => a + b, 0) / entityConfidences.length
      : 1;

  const dateOnly =
    hasDueCue || (startAt !== undefined && !hasTimeComponent(startAt));

  return {
    title,
    displayTitle,
    startAt: dateConfidence >= 0.5 ? startAt : undefined,
    estimatedMinutes,
    priority,
    source,
    recurrencePattern,
    recurrenceLabel,
    isBacklog,
    hasDueCue,
    dateOnly,
    matchedSpans,
    chips,
    entities,
    confidence,
  };
}

export function parseEventInput(
  input: string,
  refDate: Date = new Date()
): ParsedNaturalInput {
  return parseNaturalInput(input, refDate, { refDate, intent: 'event' });
}

export type SpanKind = EntityKind;
