/**
 * Planevo Command — zero-AI deterministic fast path (§12.2, §19 step 3).
 *
 * Before any model call, we try the existing deterministic parser
 * (`packages/nlp-core`). A simple single-item entry ("dentist Friday 3pm")
 * parses instantly, costs nothing, and does NOT consume a free user's AI quota.
 * Only inputs this cannot confidently handle go to the model.
 */

import { parseNaturalInput } from '@planevo/nlp-core';
import type { ExtractedResponsibility, ResponsibilityPriority } from './types';

/** Multi-item dumps are the model's job — a rough sniff for separators. */
function looksLikeMultipleItems(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 140) return true;
  if (/[\n;•]/.test(trimmed)) return true;
  // "x, y, and z" or several " and " clauses read as multiple obligations.
  const commaCount = (trimmed.match(/,/g) ?? []).length;
  const andCount = (trimmed.match(/\band\b/gi) ?? []).length;
  return commaCount >= 2 || andCount >= 2;
}

function mapPriority(p: string | undefined): ResponsibilityPriority {
  switch (p) {
    case 'critical':
      return 'urgent';
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    default:
      return 'normal';
  }
}

export interface FastPathResult {
  summary: string;
  items: ExtractedResponsibility[];
  clarificationQuestions: string[];
  confidence: number;
}

/**
 * Attempt a deterministic parse. Returns a single-item extraction result when
 * confident, or `null` to signal the caller should fall through to the model.
 */
export function tryFastPath(text: string, refDate: Date): FastPathResult | null {
  if (looksLikeMultipleItems(text)) return null;

  const parsed = parseNaturalInput(text, refDate, { refDate, intent: 'auto' });

  // Require a real title and a confident date signal to skip the model.
  const hasDate = !!parsed.startAt;
  if (!parsed.title || parsed.confidence < 0.6 || !hasDate) {
    return null;
  }

  const dueAt = parsed.startAt ? parsed.startAt.toISOString() : null;

  const item: ExtractedResponsibility = {
    title: parsed.displayTitle || parsed.title,
    description: null,
    type: 'unknown',
    dueText: null,
    dueAt: parsed.hasDueCue ? dueAt : null,
    startAt: parsed.hasDueCue ? null : dueAt,
    endAt: null,
    timezone: null,
    recurrenceRule: parsed.recurrencePattern ?? null,
    priority: mapPriority(parsed.priority),
    confidence: parsed.confidence,
    needsReview: false,
    reviewReason: null,
    whyItMatters: null,
    sourceHints: [],
  };

  return {
    summary: `Added: ${item.title}`,
    items: [item],
    clarificationQuestions: [],
    confidence: parsed.confidence,
  };
}
