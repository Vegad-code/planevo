/**
 * Planevo Command — Scheduling Bridge (§9.9 "Plan My Day", Phase 7B).
 *
 * This module wraps the EXISTING availability engine — it builds NO new
 * scheduler. The pipeline is exactly `getBrunoMasterContext()` → `findGaps()`
 * (`lib/calendar.ts`) → block proposals, the same engine that powers Daily
 * Plan and Bruno's `find_availability` tool (`lib/bruno/tools/readTools.ts`).
 *
 * `proposeSchedule` is a pure read: it NEVER writes anything. `confirmSchedule`
 * is the only place in this module that writes, and it mirrors the
 * `calendar_events` insert shape used by `executeCreateTimeBlock`
 * (`lib/bruno/executeAction.ts` ~line 576).
 *
 * Lifecycle integrity (§9.9 rule 6 / §16.9): scheduling links a responsibility
 * item to its `calendar_event_id` and carries `start_at`/`end_at`, but never
 * sets `status` to `done` and never touches `completed_at`.
 */

import { commandDb } from './db';
import { getBrunoMasterContext } from '../ai/orchestrator';
import { findGaps, type TimeWindow } from '../calendar';
import { computeUrgencyScore } from './board';
import {
  calendarDayBoundsFromDateKey,
  localDateFromIsoInTimeZone,
} from '../bruno/schedulingContext';
import { rowToItem } from './persist';
import type { ResponsibilityItem } from './types';
import type { UserAiMemory } from '../ai/memory';

/** Structural row type inferred from `rowToItem` — avoids re-declaring persist.ts's row shape. */
type ResponsibilityRow = Parameters<typeof rowToItem>[0];

export interface ProposedScheduleBlock {
  itemId: string;
  title: string;
  suggestedStart: string;
  suggestedEnd: string;
  durationMinutes: number;
}

export interface ScheduleBlockInput {
  itemId: string;
  title: string;
  suggestedStart: string;
  suggestedEnd: string;
}

export interface ConfirmedScheduleResult {
  itemId: string;
  calendarEventId: string;
  /** True when the item was already linked to a calendar event (idempotent no-op). */
  alreadyScheduled: boolean;
}

const DEFAULT_DAY_START_HOUR = 8;
const DEFAULT_DAY_END_HOUR = 22;
const DEFAULT_ASSIGNMENT_MINUTES = 45;
const DEFAULT_ITEM_MINUTES = 30;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function zonedDateKey(instant: Date, timezone: string): string {
  const parts = localDateFromIsoInTimeZone(instant.toISOString(), timezone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function weekdayName(instant: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(instant);
  } catch {
    return '';
  }
}

/** `dayStartIso` is the UTC instant of local midnight; `hhmm` is a local "HH:MM". */
function atLocalTime(dayStartIso: string, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((n) => Number(n) || 0);
  return new Date(new Date(dayStartIso).getTime() + h * 3_600_000 + m * 60_000);
}

/**
 * Work-hours bounds for today. Reuses `user_ai_memory.planning_style.work_hours`
 * when the user has set one; otherwise falls back to the same 8–22 default
 * window Bruno's `find_availability` tool uses (readTools.ts ~line 264).
 */
function resolveWorkHourBounds(
  memory: UserAiMemory | undefined,
  dayStartIso: string,
): { start: Date; end: Date } {
  const workHours = memory?.planning_style?.work_hours;
  if (workHours) {
    return {
      start: atLocalTime(dayStartIso, workHours.start),
      end: atLocalTime(dayStartIso, workHours.end),
    };
  }
  return {
    start: atLocalTime(dayStartIso, `${pad2(DEFAULT_DAY_START_HOUR)}:00`),
    end: atLocalTime(dayStartIso, `${pad2(DEFAULT_DAY_END_HOUR)}:00`),
  };
}

/**
 * Converts today's applicable `avoided_focus_windows` (user_ai_memory) into
 * `findGaps()` blocker constraints — findGaps already supports arbitrary
 * TimeWindow[] constraints (lib/calendar.ts), so this only needs to shape the
 * data, not add scheduling logic.
 */
function resolveAvoidedWindows(
  memory: UserAiMemory | undefined,
  dayStartIso: string,
  today: string,
): TimeWindow[] {
  const avoided = memory?.avoided_focus_windows ?? [];
  const windows: TimeWindow[] = [];
  for (const w of avoided) {
    if (w.days.length > 0 && !w.days.some((d) => d.toLowerCase() === today.toLowerCase())) {
      continue;
    }
    const start = atLocalTime(dayStartIso, w.start);
    const end = atLocalTime(dayStartIso, w.end);
    if (end > start) windows.push({ start, end });
  }
  return windows;
}

/** Estimated duration: `metadata.estimatedMinutes` when present, else a sane default by type. */
function estimatedDurationMinutes(item: ResponsibilityItem): number {
  const raw = item.metadata?.estimatedMinutes;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.max(15, Math.round(raw));
  }
  if (item.type === 'assignment' || item.type === 'assessment') return DEFAULT_ASSIGNMENT_MINUTES;
  return DEFAULT_ITEM_MINUTES;
}

/** Most urgent first (reuses `computeUrgencyScore`, board.ts); ties broken by soonest due date. */
function byUrgencyThenDue(items: ResponsibilityItem[], now: Date): ResponsibilityItem[] {
  return [...items].sort((a, b) => {
    const ua = computeUrgencyScore(a, now);
    const ub = computeUrgencyScore(b, now);
    if (ub !== ua) return ub - ua;
    const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    return da - db;
  });
}

/**
 * Proposes time blocks for a set of unscheduled responsibility items by
 * placing them into today's real calendar gaps, most-urgent first.
 *
 * NEVER writes anything — this is the "propose" half of §9.9's pull +
 * confirmation flow. Only `confirmSchedule` writes.
 */
export async function proposeSchedule(
  userId: string,
  itemIds: string[],
  timezone: string,
  clientNow: Date,
): Promise<ProposedScheduleBlock[]> {
  if (itemIds.length === 0) return [];

  const client = commandDb();
  const { data, error } = await client
    .from('responsibility_items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('calendar_event_id', null)
    .in('id', itemIds);
  if (error) throw error;

  const rows = (data ?? []) as ResponsibilityRow[];
  const items = rows.map(rowToItem);
  if (items.length === 0) return [];

  // Existing engine: world state (calendar occupancy, memory/preferences).
  const worldState = await getBrunoMasterContext(userId);

  const dateKey = zonedDateKey(clientNow, timezone);
  const { start: dayStartIso } = calendarDayBoundsFromDateKey(dateKey, timezone);
  const today = weekdayName(clientNow, timezone);
  const { start: workStart, end: dayEnd } = resolveWorkHourBounds(worldState.memory, dayStartIso);
  const dayStart = clientNow > workStart ? clientNow : workStart;
  if (dayStart >= dayEnd) return [];

  const constraints = resolveAvoidedWindows(worldState.memory, dayStartIso, today);

  // Existing engine: findGaps() over today's bounds (lib/calendar.ts).
  const gaps = findGaps(worldState.calendarEvents, dayStart, dayEnd, constraints).map((gap) => ({
    start: gap.start,
    remainingMinutes: gap.durationMinutes,
  }));

  const ordered = byUrgencyThenDue(items, clientNow);
  const proposals: ProposedScheduleBlock[] = [];

  for (const item of ordered) {
    const duration = estimatedDurationMinutes(item);
    const gap = gaps.find((g) => g.remainingMinutes >= duration);
    if (!gap) continue; // Does not fit anywhere today — omitted, not force-placed.

    const start = gap.start;
    const end = new Date(start.getTime() + duration * 60_000);
    proposals.push({
      itemId: item.id,
      title: item.title,
      suggestedStart: start.toISOString(),
      suggestedEnd: end.toISOString(),
      durationMinutes: duration,
    });

    // Shrink the gap from the front so the next item can't double-book it.
    gap.start = end;
    gap.remainingMinutes -= duration;
  }

  return proposals;
}

/**
 * Writes confirmed blocks to `calendar_events` (same insert shape as
 * `executeCreateTimeBlock`, lib/bruno/executeAction.ts) and links each
 * responsibility item via `calendar_event_id` + `start_at`/`end_at`, with a
 * `responsibility_events` 'scheduled' audit row. Idempotent per block: an
 * item that already carries a `calendar_event_id` is reported as
 * `alreadyScheduled` and is not re-inserted.
 *
 * Never sets `status` or `completed_at` — scheduling must not complete an
 * item (§9.9 rule 6 / §16.9).
 */
export async function confirmSchedule(
  userId: string,
  blocks: ScheduleBlockInput[],
  timezone: string,
): Promise<ConfirmedScheduleResult[]> {
  const client = commandDb();
  const results: ConfirmedScheduleResult[] = [];

  for (const block of blocks) {
    const { data: existing, error: existingError } = await client
      .from('responsibility_items')
      .select('id,calendar_event_id')
      .eq('id', block.itemId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingError || !existing) continue;

    const existingEventId = (existing as { calendar_event_id: string | null }).calendar_event_id;
    if (existingEventId) {
      results.push({ itemId: block.itemId, calendarEventId: existingEventId, alreadyScheduled: true });
      continue;
    }

    // Same calendar_events insert shape as executeCreateTimeBlock.
    const { data: createdEvent, error: insertError } = await client
      .from('calendar_events')
      .insert({
        user_id: userId,
        title: block.title.trim().slice(0, 500) || 'Untitled',
        description: null,
        start_time: block.suggestedStart,
        end_time: block.suggestedEnd,
        is_all_day: false,
        source: 'command_schedule_bridge',
        color: null,
        status: 'accepted',
        is_ai_suggested: false,
        is_deleted: false,
        is_completed: false,
      })
      .select('id')
      .single();
    if (insertError || !createdEvent) {
      console.error('[schedule-bridge] Failed to create calendar event:', insertError);
      continue;
    }
    const calendarEventId = (createdEvent as { id: string }).id;

    // Lifecycle integrity: link only — never touch status/completed_at.
    const { error: updateError } = await client
      .from('responsibility_items')
      .update({
        calendar_event_id: calendarEventId,
        start_at: block.suggestedStart,
        end_at: block.suggestedEnd,
        timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', block.itemId)
      .eq('user_id', userId);
    if (updateError) {
      console.error('[schedule-bridge] Failed to link calendar event to item:', updateError);
      continue;
    }

    // Audit trail (best-effort; matches persist.ts's pattern for responsibility_events).
    await client.from('responsibility_events').insert({
      user_id: userId,
      item_id: block.itemId,
      event_type: 'scheduled',
      actor: 'user',
      after: {
        calendar_event_id: calendarEventId,
        start_at: block.suggestedStart,
        end_at: block.suggestedEnd,
      },
    });

    results.push({ itemId: block.itemId, calendarEventId, alreadyScheduled: false });
  }

  return results;
}
