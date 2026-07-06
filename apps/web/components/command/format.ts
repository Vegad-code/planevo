/**
 * Planevo Command — presentational helpers.
 *
 * Kept deliberately small. Section copy uses the low-shame language from §38.
 * Type icons are shown only when they add information (§26.1 metadata budget).
 */

import type {
  CommandBoardSection,
  ResponsibilitySourceType,
  ResponsibilityType,
} from '@/lib/command/types';

export const SECTION_ORDER: CommandBoardSection[] = [
  'now',
  'today',
  'dueSoon',
  'onMyPlate',
  'waiting',
  'unsorted',
  'done',
];

export const SECTION_LABEL: Record<CommandBoardSection, string> = {
  now: 'Now',
  today: 'Today',
  dueSoon: 'Due soon',
  onMyPlate: 'On my plate',
  waiting: 'Waiting',
  unsorted: 'Needs review',
  done: 'Done',
};

/** Sections that render even when empty are none — empty sections don't scaffold (§26.1). */
export const ALWAYS_VISIBLE_SECTIONS: CommandBoardSection[] = [];

/** Short source glyph (single char / emoji-free). Only shown when not manual. */
export const SOURCE_GLYPH: Partial<Record<ResponsibilitySourceType, string>> = {
  voice: 'mic',
  paste: 'paste',
  calendar: 'cal',
  canvas: 'canvas',
  slack: 'slack',
  notion: 'notion',
  linear: 'linear',
};

/** Friendly type labels (DB stores stable enum values; UI shows these). */
export const TYPE_LABEL: Partial<Record<ResponsibilityType, string>> = {
  assignment: 'Assignment',
  assessment: 'Assessment',
  meeting: 'Meeting',
  class: 'Class',
  follow_up: 'Follow-up',
  errand: 'Errand',
  admin: 'Admin',
  unknown: '',
};

/**
 * Compact, human due label. Returns null when there is no date (so the row shows
 * nothing rather than an empty slot). Low-shame: overdue reads "Due yesterday",
 * never "Overdue" (§26.1 / §21.1).
 */
export function formatDue(dueAt: string | null, now: Date): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const dayMs = 24 * 36e5;
  const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const dueDay = startOfDay(due);
  const nowDay = startOfDay(now);
  const diffDays = Math.round((dueDay.getTime() - nowDay.getTime()) / dayMs);

  const time = due.getHours() !== 0 || due.getMinutes() !== 0
    ? due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : null;

  let day: string;
  if (diffDays === 0) day = 'Today';
  else if (diffDays === 1) day = 'Tomorrow';
  else if (diffDays === -1) day = 'Yesterday';
  else if (diffDays < -1) day = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  else if (diffDays <= 6) day = due.toLocaleDateString(undefined, { weekday: 'short' });
  else day = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return time ? `${day} · ${time}` : day;
}

/** True when the due date is in the past — used only for a muted accent, never a badge. */
export function isPastDue(dueAt: string | null, now: Date): boolean {
  if (!dueAt) return false;
  const t = new Date(dueAt).getTime();
  return !Number.isNaN(t) && t < now.getTime();
}
