/**
 * Planevo Command — morning re-entry digest (§9.5).
 *
 * A launch requirement, not polish: the reason to open the app each morning is to
 * see what changed, computed from `responsibility_events` + the current board — a
 * calm one-liner, never a shame wall. Moved/decayed items read as "moved to your
 * plate," never "overdue" (§9.5 / §21.1).
 *
 * Pure computation over inputs the caller fetches; no I/O here so it is testable.
 */

import type { CommandBoard, ResponsibilityItem } from './types';

export interface DigestEvent {
  eventType: string;
  actor: string;
  createdAt: string;
}

export interface DigestInput {
  board: CommandBoard;
  /** `responsibility_events` since the user's last visit. */
  eventsSinceLastVisit: DigestEvent[];
  /** Items whose due date passed since last visit (already-computed by caller). */
  newlyUrgent: ResponsibilityItem[];
  /** Items the rollover moved to today/plate since last visit. */
  movedByRollover: ResponsibilityItem[];
  /** Whether this is the user's first open of the day (caller decides). */
  isFirstOpenOfDay: boolean;
}

/**
 * Returns a single calm sentence, or null when there is nothing worth saying (so
 * the header stays quiet rather than manufacturing noise).
 */
export function computeReentryDigest(input: DigestInput): string | null {
  if (!input.isFirstOpenOfDay) return null;

  const parts: string[] = [];

  const landed = input.eventsSinceLastVisit.filter(
    (e) => e.eventType === 'created' && e.actor === 'sync',
  ).length;
  if (landed > 0) {
    parts.push(`${landed} ${landed === 1 ? 'thing' : 'things'} landed from your sources`);
  }

  const urgent = input.newlyUrgent.length;
  if (urgent > 0) {
    parts.push(`${urgent} ${urgent === 1 ? 'thing' : 'things'} became urgent`);
  }

  const moved = input.movedByRollover.length;
  if (moved > 0) {
    // Non-punitive framing (§9.5): moved, never "overdue".
    parts.push(`${moved} moved to today`);
  }

  if (parts.length === 0) {
    // Nothing changed — a gentle, honest note rather than fake urgency.
    const total =
      input.board.now.length + input.board.today.length + input.board.dueSoon.length;
    if (total === 0) return null;
    return total === 1 ? 'One thing on your plate today.' : `${total} things on your plate today.`;
  }

  // Sentence-case join: "2 things landed from your sources · 1 became urgent."
  const sentence = parts.join(' · ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
