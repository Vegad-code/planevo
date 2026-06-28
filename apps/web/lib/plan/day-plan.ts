import { format, isAfter, isWithinInterval } from 'date-fns';
import type { Tables } from '@/types/database';

export type CalendarEventRow = Tables<'calendar_events'>;

export interface DayPlanBlock {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  time: string;
  duration: number;
  type: 'focus' | 'break' | 'event' | 'constraint';
  description: string;
  reason?: string;
  status: string;
  isAiSuggested: boolean;
  isFixed: boolean;
  linkedTaskId: string | null;
  source: string | null;
  externalUrl?: string;
}

export interface DayPlanSnapshot {
  blocks: DayPlanBlock[];
  nowBlockId: string | null;
  nextBlockId: string | null;
  firstFocusBlockId: string | null;
  pendingCount: number;
  acceptedCount: number;
  fixedEventCount: number;
}

export interface OverflowTask {
  id: string;
  title: string;
  dueAt?: string | null;
  priority?: string | null;
}

function mapEventType(row: CalendarEventRow): DayPlanBlock['type'] {
  if (row.source === 'google_calendar' || row.source === 'canvas') {
    return 'event';
  }
  if (row.energy_level === 'low') {
    return 'break';
  }
  return 'focus';
}

function isFixedEvent(row: CalendarEventRow): boolean {
  return (
    row.source === 'google_calendar' ||
    row.source === 'canvas' ||
    (row.is_ai_suggested !== true && row.status === 'confirmed')
  );
}

export function calendarRowToDayBlock(row: CalendarEventRow): DayPlanBlock {
  const startTime = new Date(row.start_time);
  const endTime = row.end_time ? new Date(row.end_time) : new Date(startTime.getTime() + 30 * 60_000);
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;

  return {
    id: row.id,
    title: row.title,
    startTime,
    endTime,
    time: format(startTime, 'HH:mm'),
    duration: Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60_000)),
    type: mapEventType(row),
    description: row.description ?? '',
    reason: typeof metadata.reason === 'string' ? metadata.reason : undefined,
    status: row.status ?? 'confirmed',
    isAiSuggested: row.is_ai_suggested === true,
    isFixed: isFixedEvent(row),
    linkedTaskId: row.linked_task_id,
    source: row.source,
    externalUrl: row.location ?? undefined,
  };
}

export function buildDayPlanSnapshot(
  rows: CalendarEventRow[],
  now: Date = new Date()
): DayPlanSnapshot {
  const blocks = rows
    .filter((row) => row.status !== 'rejected')
    .map(calendarRowToDayBlock)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  let nowBlockId: string | null = null;
  let nextBlockId: string | null = null;
  let firstFocusBlockId: string | null = null;

  for (const block of blocks) {
    if (
      !firstFocusBlockId &&
      block.type === 'focus' &&
      block.isAiSuggested &&
      block.status !== 'rejected'
    ) {
      firstFocusBlockId = block.id;
    }

    if (isWithinInterval(now, { start: block.startTime, end: block.endTime })) {
      nowBlockId = block.id;
    } else if (!nextBlockId && isAfter(block.startTime, now)) {
      nextBlockId = block.id;
    }
  }

  if (!nextBlockId && !nowBlockId) {
    const upcoming = blocks.find((b) => isAfter(b.startTime, now));
    nextBlockId = upcoming?.id ?? null;
  }

  return {
    blocks,
    nowBlockId,
    nextBlockId,
    firstFocusBlockId,
    pendingCount: blocks.filter((b) => b.isAiSuggested && b.status === 'pending').length,
    acceptedCount: blocks.filter(
      (b) => b.isAiSuggested && (b.status === 'accepted' || b.status === 'confirmed')
    ).length,
    fixedEventCount: blocks.filter((b) => b.isFixed).length,
  };
}

export function getDayBounds(
  reference: Date,
  timezone?: string
): { dayStart: Date; dayEnd: Date; localHour: number } {
  const localHour = timezone
    ? parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          hourCycle: 'h23',
        }).format(reference),
        10
      )
    : reference.getHours();

  const dayStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999);

  return { dayStart, dayEnd, localHour };
}

export function hasLockedPlanToday(rows: CalendarEventRow[]): boolean {
  return rows.some(
    (row) =>
      row.is_ai_suggested === true &&
      (row.status === 'accepted' || row.status === 'confirmed') &&
      !row.is_deleted
  );
}

export function computeOverflowTasks(
  allTaskIds: string[],
  scheduledTaskIds: string[]
): number {
  const scheduled = new Set(scheduledTaskIds.filter(Boolean));
  return allTaskIds.filter((id) => !scheduled.has(id)).length;
}

export function findBlockAtNow(blocks: DayPlanBlock[], now: Date): DayPlanBlock | null {
  return (
    blocks.find((block) =>
      isWithinInterval(now, { start: block.startTime, end: block.endTime })
    ) ?? null
  );
}

export function findNextBlock(blocks: DayPlanBlock[], now: Date): DayPlanBlock | null {
  return blocks.find((block) => isAfter(block.startTime, now)) ?? null;
}

export function isPlanBuilding(rows: CalendarEventRow[]): boolean {
  const hasAiBlocks = rows.some((row) => row.is_ai_suggested === true && row.status !== 'rejected');
  return !hasAiBlocks;
}
