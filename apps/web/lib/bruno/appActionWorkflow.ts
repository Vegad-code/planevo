import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrunoActionProposal } from '@/lib/bruno/tools/types';
import { localDateTimeToUtcIso } from '@/lib/bruno/localDateTimeToUtcIso';
import { resolveProposalColor } from '@/lib/bruno/proposalColors';
import {
  fingerprintProposal,
  persistBrunoProposals,
} from '@/lib/bruno/proposalPersistence';
import { calendarDayBounds } from '@/lib/bruno/schedulingContext';
import type { Database, Json } from '@/types/database';

type Supabase = SupabaseClient<Database>;

type LocalDate = {
  year: number;
  month: number;
  day: number;
};

type CalendarRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  source: string | null;
  external_id: string | null;
  color: string | null;
  metadata: Json | null;
  is_all_day: boolean | null;
};

type ReplacementBlock = {
  title: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

/**
 * Extracts the stable, cross-sync identifiers for a calendar event so a proposal
 * can survive the internal `id` (UUID) being recycled by a Google resync. Only
 * defined keys are returned so they can be spread into a proposal payload.
 */
function stableEventIdentity(event: CalendarRow): {
  externalId?: string;
  googleEventId?: string;
} {
  const identity: { externalId?: string; googleEventId?: string } = {};
  if (event.source === 'google_calendar' && event.external_id) {
    identity.externalId = event.external_id;
  }
  const metadata =
    event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};
  if (typeof metadata.google_event_id === 'string' && metadata.google_event_id.length > 0) {
    identity.googleEventId = metadata.google_event_id;
  }
  return identity;
}

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
};

type AppActionIntent =
  | {
      kind: 'move_day';
      sourceDate: LocalDate;
      targetDate: LocalDate;
      replacement?: ReplacementBlock;
    }
  | {
      kind: 'move_day_tasks';
      sourceDate: LocalDate;
      targetDate: LocalDate;
    }
  | {
      kind: 'delete_event_on_day';
      sourceDate: LocalDate;
      titleQuery?: string;
    }
  | {
      kind: 'reschedule_single_event';
      sourceDate: LocalDate;
      titleQuery?: string;
      targetHour: number;
      targetMinute: number;
      sourceHour?: number;
      sourceMinute?: number;
    };

type WorkflowData = {
  userId: string;
  message: string;
  timeZone: string;
  referenceDateIso: string;
  intent: AppActionIntent | null;
  events: CalendarRow[];
  tasks: TaskRow[];
  proposals: BrunoActionProposal[];
  responseText: string | null;
  handled: boolean;
};

export type BrunoAppActionWorkflowResult = {
  handled: boolean;
  text: string;
  proposals: BrunoActionProposal[];
};

const ActionWorkflowState = Annotation.Root({
  data: Annotation<WorkflowData>,
});

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

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

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function localDateKey(date: LocalDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function localDateLabel(date: LocalDate): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day, 12)));
}

function localDateFromReference(referenceDate: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate);

  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
  };
}

function addDays(date: LocalDate, days: number): LocalDate {
  const base = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

function compareLocalDate(left: LocalDate, right: LocalDate): number {
  return localDateKey(left).localeCompare(localDateKey(right));
}

function weekdayFor(date: LocalDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, 12)).getUTCDay();
}

function inferYearForMonthDay(month: number, day: number, reference: LocalDate): number {
  const candidate = { year: reference.year, month, day };
  return compareLocalDate(candidate, addDays(reference, -1)) < 0
    ? reference.year + 1
    : reference.year;
}

function thisWeekDate(weekday: number, reference: LocalDate): LocalDate {
  const currentDow = weekdayFor(reference);
  const mondayOffset = currentDow === 0 ? -6 : 1 - currentDow;
  const monday = addDays(reference, mondayOffset);
  const targetOffset = weekday === 0 ? 6 : weekday - 1;
  return addDays(monday, targetOffset);
}

function resolveWeekdayDate(
  weekday: number,
  qualifier: string | undefined,
  reference: LocalDate
): LocalDate {
  const currentWeekCandidate = thisWeekDate(weekday, reference);
  if (qualifier?.toLowerCase() === 'this') return currentWeekCandidate;

  if (qualifier?.toLowerCase() === 'next') {
    const currentDow = weekdayFor(reference);
    const rawOffset = (weekday - currentDow + 7) % 7;
    return addDays(reference, rawOffset === 0 ? 7 : rawOffset);
  }

  return compareLocalDate(currentWeekCandidate, reference) < 0
    ? addDays(currentWeekCandidate, 7)
    : currentWeekCandidate;
}

function resolveDateExpression(
  raw: string,
  referenceDate: Date,
  timeZone: string,
  relativeTo?: LocalDate
): LocalDate | null {
  const text = raw.toLowerCase();
  const reference = localDateFromReference(referenceDate, timeZone);
  const base = relativeTo ?? reference;

  if (/\bnext day\b/.test(text)) return addDays(base, 1);
  if (/\btomorrow\b/.test(text)) return addDays(reference, 1);
  if (/\btoday\b/.test(text)) return reference;

  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
    };
  }

  const monthPattern =
    '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)';
  const monthDay = text.match(
    new RegExp(`\\b${monthPattern}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i')
  );
  if (monthDay) {
    const month = MONTHS[monthDay[1].toLowerCase()];
    const day = Number(monthDay[2]);
    const year = monthDay[3]
      ? Number(monthDay[3])
      : inferYearForMonthDay(month, day, reference);
    return { year, month, day };
  }

  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const month = Number(numeric[1]);
    const day = Number(numeric[2]);
    const explicitYear = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : null;
    return {
      year: explicitYear ?? inferYearForMonthDay(month, day, reference),
      month,
      day,
    };
  }

  const weekday = text.match(
    /\b(?:(this|next)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i
  );
  if (weekday) {
    return resolveWeekdayDate(
      WEEKDAYS[weekday[2].toLowerCase()],
      weekday[1],
      reference
    );
  }

  return null;
}

function extractDateAfter(text: string, markers: string[]): string | null {
  for (const marker of markers) {
    const pattern = new RegExp(`${marker}\\s+(.+?)(?:\\s+(?:and|then|replace|if|with)\\b|[.,;]|$)`, 'i');
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function to24Hour(hour: number, meridiem?: string): number {
  if (!meridiem) return hour;
  const normalized = meridiem.toLowerCase();
  if (normalized === 'pm' && hour < 12) return hour + 12;
  if (normalized === 'am' && hour === 12) return 0;
  return hour;
}

function parseReplacementBlock(text: string): ReplacementBlock | undefined {
  const normalized = text.toLowerCase();
  if (!/\b(work|focus)\b/.test(normalized)) return undefined;

  const timeRange = normalized.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/
  );
  if (!timeRange) return undefined;

  const endMeridiem = timeRange[6];
  const startMeridiem = timeRange[3] ?? endMeridiem;
  return {
    title: /\bwork\b/.test(normalized) ? 'Work' : 'Focus',
    startHour: to24Hour(Number(timeRange[1]), startMeridiem),
    startMinute: timeRange[2] ? Number(timeRange[2]) : 0,
    endHour: to24Hour(Number(timeRange[4]), endMeridiem),
    endMinute: timeRange[5] ? Number(timeRange[5]) : 0,
  };
}

function parseClockTime(text: string): { hour: number; minute: number } | null {
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!match) return null;
  const hour = to24Hour(Number(match[1]), match[3]);
  const minute = match[2] ? Number(match[2]) : 0;
  return { hour, minute };
}

function parseAppActionIntent(
  message: string,
  referenceDate: Date,
  timeZone: string
): AppActionIntent | null {
  const text = normalizeText(message);
  const lowered = text.toLowerCase();

  if (
    /\b(move|reschedule|shift|push)\b/.test(lowered) &&
    /\b(tasks?|todos?|assignments?)\b/.test(lowered) &&
    !/\b(events?|calendar|meeting|schedule|block)\b/.test(lowered)
  ) {
    const sourceText =
      extractDateAfter(lowered, ['from', 'on', 'due']) ??
      extractDateAfter(lowered, ['for']) ??
      lowered;
    const sourceDate =
      resolveDateExpression(sourceText, referenceDate, timeZone) ??
      localDateFromReference(referenceDate, timeZone);
    const targetText = extractDateAfter(lowered, ['to', 'onto', 'into']) ?? lowered;
    const targetDate = resolveDateExpression(
      targetText,
      referenceDate,
      timeZone,
      sourceDate
    );
    if (!targetDate) return null;
    return { kind: 'move_day_tasks', sourceDate, targetDate };
  }

  const singleReschedule = lowered.match(
    /\b(?:reschedule|move|shift)\s+(?:my\s+)?(.+?)\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  );
  if (
    singleReschedule &&
    /\b(meeting|event|appointment|call|block)\b/.test(lowered) &&
    !/\b(everything|anything|all)\b/.test(lowered)
  ) {
    const targetTime = parseClockTime(singleReschedule[2]);
    if (!targetTime) return null;
    const sourceTime = parseClockTime(singleReschedule[1]) ?? undefined;
    const titleQuery = singleReschedule[1]
      ?.replace(/\b(at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '')
      .replace(/\b(meeting|event|appointment|call|block)\b/gi, '')
      .trim();
    const sourceDate =
      resolveDateExpression(lowered, referenceDate, timeZone) ??
      localDateFromReference(referenceDate, timeZone);
    return {
      kind: 'reschedule_single_event',
      sourceDate,
      ...(titleQuery && titleQuery.length > 1 ? { titleQuery } : {}),
      targetHour: targetTime.hour,
      targetMinute: targetTime.minute,
      ...(sourceTime
        ? { sourceHour: sourceTime.hour, sourceMinute: sourceTime.minute }
        : {}),
    };
  }

  if (
    /\b(delete|remove|clear)\b/.test(lowered) &&
    /\b(event|calendar|meeting|block)\b/.test(lowered)
  ) {
    const sourceText =
      extractDateAfter(lowered, ['on', 'from', 'for']) ?? lowered;
    const sourceDate = resolveDateExpression(sourceText, referenceDate, timeZone);
    if (!sourceDate) return null;

    const queryMatch = lowered.match(
      /\b(?:delete|remove|clear)\s+(?:the\s+)?(.+?)\s+(?:on|from|for)\b/i
    );
    const query = queryMatch?.[1]?.replace(/\b(event|calendar|meeting|block)\b/g, '').trim();

    return {
      kind: 'delete_event_on_day',
      sourceDate,
      ...(query && query.length > 1 ? { titleQuery: query } : {}),
    };
  }

  if (
    /\b(move|reschedule|shift|push)\b/.test(lowered) &&
    /\b(everything|anything|all|events?|schedule|calendar|have)\b/.test(lowered)
  ) {
    const sourceText =
      extractDateAfter(lowered, ['on', 'from']) ??
      extractDateAfter(lowered, ['for']) ??
      lowered;
    const sourceDate = resolveDateExpression(sourceText, referenceDate, timeZone);
    if (!sourceDate) return null;

    const targetText =
      extractDateAfter(lowered, ['to', 'onto', 'into']) ?? lowered;
    const targetDate = resolveDateExpression(
      targetText,
      referenceDate,
      timeZone,
      sourceDate
    );
    if (!targetDate) return null;

    return {
      kind: 'move_day',
      sourceDate,
      targetDate,
      replacement: parseReplacementBlock(lowered),
    };
  }

  return null;
}

function dayBounds(date: LocalDate, timeZone: string): { start: string; end: string } {
  return calendarDayBounds(date, timeZone);
}

function localTimeParts(iso: string, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return { hour: read('hour'), minute: read('minute') };
}

function moveEventPayload(event: CalendarRow, targetDate: LocalDate, timeZone: string) {
  const start = localTimeParts(event.start_time, timeZone);
  const startTime = localDateTimeToUtcIso(
    targetDate.year,
    targetDate.month,
    targetDate.day,
    start.hour,
    start.minute,
    timeZone
  );
  const durationMs =
    event.end_time && new Date(event.end_time).getTime() > new Date(event.start_time).getTime()
      ? new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
      : 60 * 60 * 1000;
  const endTime = new Date(new Date(startTime).getTime() + durationMs).toISOString();

  return { startTime, endTime };
}

function replacementTimes(block: ReplacementBlock, date: LocalDate, timeZone: string) {
  return {
    startTime: localDateTimeToUtcIso(
      date.year,
      date.month,
      date.day,
      block.startHour,
      block.startMinute,
      timeZone
    ),
    endTime: localDateTimeToUtcIso(
      date.year,
      date.month,
      date.day,
      block.endHour,
      block.endMinute,
      timeZone
    ),
  };
}

function intervalsOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
) {
  return new Date(leftStart).getTime() < new Date(rightEnd).getTime() &&
    new Date(leftEnd).getTime() > new Date(rightStart).getTime();
}

function proposalBase(input: {
  type: BrunoActionProposal['type'];
  title: string;
  description: string;
  riskLevel: BrunoActionProposal['riskLevel'];
  payload: Record<string, unknown>;
  entityId?: string;
}): BrunoActionProposal {
  const fingerprint = fingerprintProposal({
    type: input.type,
    entityId: input.entityId,
    startTime:
      typeof input.payload.startTime === 'string'
        ? input.payload.startTime
        : undefined,
    endTime:
      typeof input.payload.endTime === 'string' ? input.payload.endTime : undefined,
    title: input.title,
  });
  return {
    id: fingerprint,
    type: input.type,
    title: input.title,
    description: input.description,
    status: 'pending_confirmation',
    riskLevel: input.riskLevel,
    requiresConfirmation: true,
    payload: {
      ...input.payload,
      proposalFingerprint: fingerprint,
    },
    createdAt: new Date().toISOString(),
  };
}

function buildProposalsForIntent(
  data: WorkflowData,
  timeZone: string
): { proposals: BrunoActionProposal[]; text: string } {
  const intent = data.intent;
  if (!intent) {
    return { proposals: [], text: '' };
  }

  if (intent.kind === 'delete_event_on_day') {
    let events = data.events;
    if (intent.titleQuery) {
      const query = intent.titleQuery.toLowerCase();
      events = events.filter((event) => event.title.toLowerCase().includes(query));
    }

    if (events.length === 0) {
      return {
        proposals: [],
        text: `I couldn't find a matching event on ${localDateLabel(intent.sourceDate)}.`,
      };
    }

    if (events.length > 1) {
      const items = events
        .slice(0, 6)
        .map((event) => `- ${event.title}`)
        .join('\n');
      return {
        proposals: [],
        text: `I found multiple events on ${localDateLabel(intent.sourceDate)}. Tell me which one to delete:\n\n${items}`,
      };
    }

    const event = events[0];
    return {
      text: `I found **${event.title}** on ${localDateLabel(intent.sourceDate)} and prepared a delete confirmation.`,
      proposals: [
        proposalBase({
          type: 'DELETE_CALENDAR_EVENT',
          title: event.title,
          description: `Delete ${event.title}`,
          riskLevel: 'high',
          entityId: event.id,
          payload: {
            eventId: event.id,
            ...stableEventIdentity(event),
            deleteReason: 'Requested in Bruno',
            source: 'bruno',
          },
        }),
      ],
    };
  }

  if (intent.kind === 'move_day_tasks') {
    const sourceKey = localDateKey(intent.sourceDate);
    const targetKey = localDateKey(intent.targetDate);
    const matchingTasks = data.tasks.filter(
      (task) => task.due_date?.slice(0, 10) === sourceKey
    );

    if (matchingTasks.length === 0) {
      return {
        proposals: [],
        text: `I didn't find any tasks due on ${localDateLabel(intent.sourceDate)}.`,
      };
    }

    const proposals = matchingTasks.map((task) =>
      proposalBase({
        type: 'RESCHEDULE_TASK',
        title: task.title,
        description: `Move ${task.title} to ${localDateLabel(intent.targetDate)}`,
        riskLevel: 'low',
        entityId: task.id,
        payload: {
          taskId: task.id,
          dueDate: targetKey,
          source: 'bruno',
        },
      })
    );

    return {
      proposals,
      text: `I prepared ${proposals.length} task reschedule${proposals.length === 1 ? '' : 's'} for confirmation.`,
    };
  }

  if (intent.kind === 'reschedule_single_event') {
    let events = data.events;
    if (intent.titleQuery) {
      const query = intent.titleQuery.toLowerCase();
      events = events.filter((event) => event.title.toLowerCase().includes(query));
    }
    if (intent.sourceHour !== undefined) {
      events = events.filter((event) => {
        const parts = localTimeParts(event.start_time, timeZone);
        return parts.hour === intent.sourceHour && parts.minute === (intent.sourceMinute ?? 0);
      });
    }

    if (events.length === 0) {
      return {
        proposals: [],
        text: `I couldn't find a matching event on ${localDateLabel(intent.sourceDate)}.`,
      };
    }
    if (events.length > 1) {
      const items = events
        .slice(0, 6)
        .map((event) => `- ${event.title}`)
        .join('\n');
      return {
        proposals: [],
        text: `I found multiple matching events. Tell me which one to reschedule:\n\n${items}`,
      };
    }

    const event = events[0];
    const startTime = localDateTimeToUtcIso(
      intent.sourceDate.year,
      intent.sourceDate.month,
      intent.sourceDate.day,
      intent.targetHour,
      intent.targetMinute,
      timeZone
    );
    const durationMs =
      event.end_time && new Date(event.end_time).getTime() > new Date(event.start_time).getTime()
        ? new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
        : 60 * 60 * 1000;
    const endTime = new Date(new Date(startTime).getTime() + durationMs).toISOString();

    return {
      text: `I prepared a reschedule for **${event.title}** on ${localDateLabel(intent.sourceDate)}.`,
      proposals: [
        proposalBase({
          type: 'UPDATE_CALENDAR_EVENT',
          title: event.title,
          description: `Reschedule ${event.title}`,
          riskLevel: 'medium',
          entityId: event.id,
          payload: {
            eventId: event.id,
            ...stableEventIdentity(event),
            startTime,
            endTime,
            source: 'bruno',
          },
        }),
      ],
    };
  }

  if (intent.kind === 'move_day') {
    let existingReplacementIds = new Set<string>();
    let replacementWindow: { startTime: string; endTime: string } | null = null;

    if (intent.replacement) {
      replacementWindow = replacementTimes(
        intent.replacement,
        intent.sourceDate,
        timeZone
      );
      existingReplacementIds = new Set(
        data.events
          .filter((event) => {
            const titleMatches =
              event.title.trim().toLowerCase() ===
              intent.replacement?.title.toLowerCase();
            const eventEnd = event.end_time ?? event.start_time;
            return (
              titleMatches &&
              replacementWindow &&
              intervalsOverlap(
                event.start_time,
                eventEnd,
                replacementWindow.startTime,
                replacementWindow.endTime
              )
            );
          })
          .map((event) => event.id)
      );
    }

    const movableEvents = data.events.filter(
      (event) => !existingReplacementIds.has(event.id)
    );

    const proposals = movableEvents.map((event) => {
      const { startTime, endTime } = moveEventPayload(
        event,
        intent.targetDate,
        timeZone
      );
      return proposalBase({
        type: 'UPDATE_CALENDAR_EVENT',
        title: event.title,
        description: `Move ${event.title} to ${localDateLabel(intent.targetDate)}`,
        riskLevel: 'medium',
        entityId: event.id,
        payload: {
          eventId: event.id,
          ...stableEventIdentity(event),
          startTime,
          endTime,
          source: 'bruno',
        },
      });
    });

    if (intent.replacement) {
      const { startTime, endTime } =
        replacementWindow ??
        replacementTimes(intent.replacement, intent.sourceDate, timeZone);
      const alreadyExists = existingReplacementIds.size > 0;

      if (!alreadyExists) {
        const color = resolveProposalColor({
          colorCategory: 'work',
          title: intent.replacement.title,
          description: 'Dedicated work time',
        });
        proposals.push(
          proposalBase({
            type: 'CREATE_TIME_BLOCK',
            title: intent.replacement.title,
            description: 'Dedicated work time',
            riskLevel: 'low',
            payload: {
              startTime,
              endTime,
              color,
              colorCategory: 'work',
              source: 'bruno',
            },
          })
        );
      }
    }

    if (proposals.length === 0) {
      return {
        proposals: [],
        text: `I didn't find anything to move on ${localDateLabel(intent.sourceDate)}.`,
      };
    }

    return {
      proposals,
      text: `I prepared ${proposals.length} calendar change${proposals.length === 1 ? '' : 's'} for confirmation.`,
    };
  }

  return { proposals: [], text: '' };
}

async function loadRecordsForIntent(
  supabase: Supabase,
  userId: string,
  intent: AppActionIntent,
  timeZone: string
): Promise<{ events: CalendarRow[]; tasks: TaskRow[] }> {
  const { start, end } = dayBounds(intent.sourceDate, timeZone);
  const sourceKey = localDateKey(intent.sourceDate);

  const needsEvents =
    intent.kind === 'move_day' ||
    intent.kind === 'delete_event_on_day' ||
    intent.kind === 'reschedule_single_event';
  const needsTasks = intent.kind === 'move_day_tasks';

  let events: CalendarRow[] = [];
  let tasks: TaskRow[] = [];

  if (needsEvents) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('id, title, description, start_time, end_time, status, source, external_id, color, metadata, is_all_day')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .lt('start_time', end)
      .or(`and(start_time.gte.${start},start_time.lt.${end}),and(start_time.lt.${start},end_time.gt.${start})`)
      .order('start_time', { ascending: true })
      .limit(100);
    if (error) throw error;
    events = (data ?? []).filter(
      (event): event is CalendarRow =>
        typeof event.id === 'string' &&
        typeof event.title === 'string' &&
        typeof event.start_time === 'string'
    );
  }

  if (needsTasks) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, due_date')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('due_date', sourceKey)
      .order('title', { ascending: true })
      .limit(100);
    if (error) throw error;
    tasks = (data ?? []).filter(
      (task): task is TaskRow =>
        typeof task.id === 'string' && typeof task.title === 'string'
    );
  }

  return { events, tasks };
}

function shouldTreatWorkflowAsHandled(text: string, proposalCount: number): boolean {
  if (proposalCount > 0) return true;
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/didn't find|couldn't find|I didn't find any tasks/i.test(trimmed)) {
    return false;
  }
  return true;
}

export async function runBrunoAppActionWorkflow(input: {
  userId: string;
  message: string;
  timeZone: string;
  supabase: Supabase;
  referenceDate?: Date;
  dataAccess?: {
    calendar?: boolean;
    tasks?: boolean;
  };
}): Promise<BrunoAppActionWorkflowResult> {
  const referenceDate = input.referenceDate ?? new Date();

  const graph = new StateGraph(ActionWorkflowState)
    .addNode('resolve_intent', async (state: typeof ActionWorkflowState.State) => {
      const intent = parseAppActionIntent(
        input.message,
        referenceDate,
        input.timeZone
      );
      if (!intent) {
        return {
          data: {
            ...state.data,
            intent: null,
            handled: false,
          },
        };
      }

      const calendarAccess = input.dataAccess?.calendar !== false;
      const tasksAccess = input.dataAccess?.tasks !== false;
      const needsCalendar =
        intent.kind === 'move_day' ||
        intent.kind === 'delete_event_on_day' ||
        intent.kind === 'reschedule_single_event';
      const needsTasks = intent.kind === 'move_day_tasks';

      if ((needsCalendar && !calendarAccess) || (needsTasks && !tasksAccess)) {
        return {
          data: {
            ...state.data,
            intent: null,
            handled: false,
          },
        };
      }

      return {
        data: {
          ...state.data,
          intent,
        },
      };
    })
    .addNode('load_records', async (state: typeof ActionWorkflowState.State) => {
      const intent = state.data.intent;
      if (!intent) {
        return {
          data: {
            ...state.data,
            handled: false,
          },
        };
      }

      const { events, tasks } = await loadRecordsForIntent(
        input.supabase,
        input.userId,
        intent,
        input.timeZone
      );

      return {
        data: {
          ...state.data,
          events,
          tasks,
        },
      };
    })
    .addNode('build_proposals', async (state: typeof ActionWorkflowState.State) => {
      if (!state.data.intent) {
        return {
          data: {
            ...state.data,
            handled: false,
          },
        };
      }

      const { proposals, text } = buildProposalsForIntent(
        state.data,
        input.timeZone
      );
      await persistBrunoProposals(
        input.supabase,
        input.userId,
        proposals,
        'deterministic_app_action_workflow'
      );

      return {
        data: {
          ...state.data,
          proposals,
          responseText: text,
          handled: shouldTreatWorkflowAsHandled(text, proposals.length),
        },
      };
    })
    .addEdge(START, 'resolve_intent')
    .addEdge('resolve_intent', 'load_records')
    .addEdge('load_records', 'build_proposals')
    .addEdge('build_proposals', END)
    .compile();

  const result = await graph.invoke({
    data: {
      userId: input.userId,
      message: input.message,
      timeZone: input.timeZone,
      referenceDateIso: referenceDate.toISOString(),
      intent: null,
      events: [],
      tasks: [],
      proposals: [],
      responseText: null,
      handled: false,
    },
  });

  return {
    handled: result.data.handled,
    text: result.data.responseText ?? '',
    proposals: result.data.proposals,
  };
}
