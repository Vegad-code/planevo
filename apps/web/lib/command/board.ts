/**
 * Planevo Command — deterministic board computation.
 *
 * Source of truth: docs/superpowers/plans/comprehensive.md §21 + §21.1.
 *
 * The board is ALWAYS computed from lifecycle status + dates + urgency — sections
 * are never stored (§16.3). AI never decides live section placement. Every function
 * here is pure: `now` and `timezone` are always passed in, never read from the
 * ambient clock, so the same inputs always produce the same board (testable, and
 * safe to run identically on server and client).
 */

import type {
  CommandBoard,
  CommandBoardSummary,
  ResponsibilityItem,
} from './types';

/** Max items shown in `Now` before overflow spills to Today / On My Plate (§21.1). */
export const NOW_SECTION_CAP = 7;

const HOUR_MS = 36e5;
const DAY_MS = 24 * HOUR_MS;

/**
 * Urgency score (§21.1). The overdue bonus (+50) applies only within the first
 * 48 hours; after that the item is scored as if it were merely due "soon" so it
 * stays discoverable without screaming.
 */
export function computeUrgencyScore(item: ResponsibilityItem, now: Date): number {
  let score = 0;
  if (item.priority === 'urgent') score += 40;
  else if (item.priority === 'high') score += 25;
  if (item.needsReview) score += 10;

  if (!item.dueAt) return Math.min(score, 100);

  const hoursUntilDue = (new Date(item.dueAt).getTime() - now.getTime()) / HOUR_MS;

  if (hoursUntilDue < 0) {
    const hoursOverdue = -hoursUntilDue;
    if (hoursOverdue < 48) {
      // Freshly overdue: full escalation.
      score += 50;
    } else {
      // Decayed overdue: score as "due soon", not as a screaming emergency.
      score += 20;
    }
  } else if (hoursUntilDue <= 24) {
    score += 35;
  } else if (hoursUntilDue <= 72) {
    score += 20;
  } else if (hoursUntilDue <= 168) {
    score += 10;
  }

  return Math.min(score, 100);
}

/** True once an overdue item has aged past the 48h anti-shame threshold (§21.1). */
export function isDecayedOverdue(item: ResponsibilityItem, now: Date): boolean {
  if (!item.dueAt) return false;
  const hoursOverdue = (now.getTime() - new Date(item.dueAt).getTime()) / HOUR_MS;
  return hoursOverdue >= 48;
}

/** The user-pinned section, if any (`metadata.pinnedSection`, §16.3 / §21). */
function pinnedSection(item: ResponsibilityItem): string | null {
  const pinned = item.metadata?.pinnedSection;
  return typeof pinned === 'string' ? pinned : null;
}

/**
 * Compares two YYYY-MM-DD calendar days in the given IANA timezone.
 * We format both instants in the target zone and compare the wall-clock date,
 * so "today" respects the user's timezone rather than the server's. No date
 * library — `Intl.DateTimeFormat` only.
 */
function zonedDateKey(instant: Date, timezone: string): string {
  try {
    // en-CA gives ISO-like YYYY-MM-DD ordering.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    // Invalid timezone — fall back to UTC date key so we never throw at render.
    return instant.toISOString().slice(0, 10);
  }
}

function isSameZonedDay(a: Date, b: Date, timezone: string): boolean {
  return zonedDateKey(a, timezone) === zonedDateKey(b, timezone);
}

type ComputedSection =
  | 'now'
  | 'today'
  | 'dueSoon'
  | 'onMyPlate'
  | 'unsorted'
  | 'waiting'
  | 'done';

/**
 * Decides which section a single item belongs to, ignoring the Now cap (which is
 * applied globally afterward). Order of checks matters and follows §21.
 */
function sectionFor(item: ResponsibilityItem, now: Date, timezone: string): ComputedSection {
  if (item.status === 'done') return 'done';
  if (item.status === 'waiting') return 'waiting';

  // Unsorted: needs review, or an unknown-type item with no time anchor (§21).
  if (item.needsReview) return 'unsorted';
  if (item.type === 'unknown' && !item.dueAt && !item.startAt) return 'unsorted';

  const pin = pinnedSection(item);
  if (pin === 'now') return 'now';
  if (pin === 'today') return 'today';

  const hasCalendarToday =
    item.calendarEventId != null &&
    item.startAt != null &&
    isSameZonedDay(new Date(item.startAt), now, timezone);

  if (item.dueAt) {
    const due = new Date(item.dueAt);
    const hoursUntilDue = (due.getTime() - now.getTime()) / HOUR_MS;

    if (hoursUntilDue < 0) {
      // Overdue: within 48h it stays in Now; after that it decays to On My Plate.
      return isDecayedOverdue(item, now) ? 'onMyPlate' : 'now';
    }

    if (hoursUntilDue <= 24) return 'now';
    if (isSameZonedDay(due, now, timezone)) return 'today';
    if (hasCalendarToday) return 'today';

    const daysUntilDue = (due.getTime() - now.getTime()) / DAY_MS;
    if (daysUntilDue <= 7) return 'dueSoon';
    return 'onMyPlate';
  }

  // No due date.
  if (item.priority === 'urgent' || item.priority === 'high') return 'now';
  if (hasCalendarToday) return 'today';
  return 'onMyPlate';
}

function byUrgencyDesc(now: Date) {
  return (a: ResponsibilityItem, b: ResponsibilityItem): number => {
    const ua = computeUrgencyScore(a, now);
    const ub = computeUrgencyScore(b, now);
    if (ub !== ua) return ub - ua;
    // Tie-break: sooner due date first, then most recently created.
    const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  };
}

/**
 * Computes the full board. `timezone` is the user's IANA zone used for "today"
 * boundaries; individual items may carry their own `timezone`, which takes
 * precedence when present.
 */
export function computeBoardSections(
  items: ResponsibilityItem[],
  now: Date,
  timezone: string,
): CommandBoard {
  const board: CommandBoard = {
    now: [],
    today: [],
    dueSoon: [],
    onMyPlate: [],
    unsorted: [],
    waiting: [],
    done: [],
  };

  for (const item of items) {
    const tz = item.timezone ?? timezone;
    const section = sectionFor(item, now, tz);
    board[section].push(item);
  }

  const sort = byUrgencyDesc(now);
  board.now.sort(sort);
  board.today.sort(sort);
  board.dueSoon.sort(sort);
  board.onMyPlate.sort(sort);
  board.unsorted.sort(sort);
  board.waiting.sort(sort);
  // `done` reads most-recently-completed first.
  board.done.sort((a, b) => {
    const ca = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const cb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return cb - ca;
  });

  // Now-section cap: an urgent section with 30 items communicates only panic
  // (§21.1). Overflow (already urgency-sorted) spills into Today, keeping order.
  if (board.now.length > NOW_SECTION_CAP) {
    const overflow = board.now.slice(NOW_SECTION_CAP);
    board.now = board.now.slice(0, NOW_SECTION_CAP);
    board.today = [...overflow, ...board.today];
  }

  return board;
}

/** Compact counts for the summary strip and the Bruno context snapshot (§10.2, §11.4). */
export function summarizeBoard(board: CommandBoard): CommandBoardSummary {
  return {
    nowCount: board.now.length,
    todayCount: board.today.length,
    dueSoonCount: board.dueSoon.length,
    unsortedCount: board.unsorted.length,
  };
}
