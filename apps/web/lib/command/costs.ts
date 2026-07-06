/**
 * Planevo Command — cost estimation.
 *
 * Source of truth: docs/superpowers/plans/comprehensive.md §13 (pricing snapshot,
 * verified July 2026 — re-check before production launch).
 *
 * Text pricing delegates to the existing `costEstimator` so there is one source of
 * model pricing truth (§16.7 spirit: reuse, don't fork). This module adds the
 * per-minute voice pricing the base estimator does not cover.
 */

import { estimateModelCostCents, type TokenUsage } from '@/lib/bruno/costEstimator';

/** Voice transcription price per minute (§13). Verified July 2026 — re-check pre-launch. */
export const VOICE_PRICING_PER_MINUTE_USD: Record<string, number> = {
  'gpt-4o-transcribe': 0.006,
  'gpt-4o-mini-transcribe': 0.003,
  'gpt-realtime-whisper': 0.017,
};

/** Estimated text cost in USD for a model + token usage. Returns 0 if unknown. */
export function estimateTextCostUsd(model: string, usage: TokenUsage): number {
  const cents = estimateModelCostCents(model, usage);
  return cents == null ? 0 : cents / 100;
}

/** Estimated voice cost in USD for a model + audio duration in seconds. */
export function estimateVoiceCostUsd(model: string, audioSeconds: number): number {
  const perMinute = VOICE_PRICING_PER_MINUTE_USD[model];
  if (perMinute == null) return 0;
  return (audioSeconds / 60) * perMinute;
}
