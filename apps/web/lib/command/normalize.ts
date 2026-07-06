/**
 * Planevo Command — output normalization (§19 step 9).
 *
 * Normalizes extracted responsibilities: clamps types to the launch subset,
 * validates ISO dates, and defaults priority/confidence. Date PARSING of free
 * text is not done here — the extraction model resolves `dueAt`; any relative
 * phrase left in `dueText` is resolved through the single flexible parser in
 * `lib/bruno/dates.ts` (never a second parser, per CLAUDE.md).
 */

import type {
  ExtractedResponsibility,
  ResponsibilityPriority,
  ResponsibilityType,
} from './types';
import { LAUNCH_RESPONSIBILITY_TYPES } from './types';
import type { CommandExtractionParsed } from './schema';

const LAUNCH_TYPE_SET = new Set<string>(LAUNCH_RESPONSIBILITY_TYPES);

/**
 * Map any of the full 16-type vocabulary down to the 8-type launch subset (§10.5).
 * Family/household → errand; money/health → admin; creative/idea → unknown.
 */
export function toLaunchType(type: ResponsibilityType): ResponsibilityType {
  if (LAUNCH_TYPE_SET.has(type)) return type;
  switch (type) {
    case 'family':
    case 'practice':
      return 'errand';
    case 'money':
    case 'health':
    case 'habit_like_routine':
    case 'work_deadline':
      return 'admin';
    case 'creative':
    case 'idea':
    default:
      return 'unknown';
  }
}

function isValidIso(value: string | null): value is string {
  if (!value) return false;
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

const VALID_PRIORITIES: ReadonlySet<ResponsibilityPriority> = new Set([
  'low',
  'normal',
  'high',
  'urgent',
]);

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

/** Normalize one extracted item into a clean `ExtractedResponsibility`. */
export function normalizeExtractedItem(
  item: ExtractedResponsibility,
): ExtractedResponsibility {
  const type = toLaunchType(item.type);
  const priority: ResponsibilityPriority = VALID_PRIORITIES.has(item.priority)
    ? item.priority
    : 'normal';

  const dueAt = isValidIso(item.dueAt) ? item.dueAt : null;
  const startAt = isValidIso(item.startAt) ? item.startAt : null;
  const endAt = isValidIso(item.endAt) ? item.endAt : null;

  // If the model left an unresolved due phrase but no concrete date, force review
  // rather than guessing (§22: mark uncertain dates as needsReview).
  const hasUnresolvedDue = !dueAt && !!item.dueText;
  const needsReview = item.needsReview || hasUnresolvedDue;

  return {
    ...item,
    title: item.title.trim().slice(0, 160),
    description: item.description?.trim() || null,
    type,
    priority,
    dueAt,
    startAt,
    endAt,
    confidence: clampConfidence(item.confidence),
    needsReview,
    reviewReason:
      needsReview && !item.reviewReason && hasUnresolvedDue
        ? `Needs a date (${item.dueText})`
        : item.reviewReason,
    whyItMatters: item.whyItMatters?.trim() || null,
    sourceHints: item.sourceHints ?? [],
  };
}

/** Normalize an entire extraction result. */
export function normalizeExtraction(
  parsed: CommandExtractionParsed,
): CommandExtractionParsed {
  return {
    ...parsed,
    items: parsed.items.map((i) => normalizeExtractedItem(i as ExtractedResponsibility)),
    confidence: clampConfidence(parsed.confidence),
  };
}
