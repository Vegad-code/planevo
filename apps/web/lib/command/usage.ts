/**
 * Planevo Command — usage limits & enforcement.
 *
 * Source of truth: docs/superpowers/plans/comprehensive.md §15, §27, §14.7.
 *
 * Command shares the global AI cap (`AI_DAILY_LIMITS`) via the existing rate
 * limiter — it does NOT get a separate global cap. Deep Bruno metering is NOT
 * counted here; it delegates entirely to the Bruno credit ledger (§12.3). The
 * deterministic fast path (§12.2) bypasses enforcement because it makes no
 * provider call.
 */

import {
  checkRateLimitForUser,
  type RateLimitResult,
} from '@/lib/auth/rateLimit';
import type { PlanType } from '@/lib/auth/subscription';
import type { CommandUsageFeature } from './models';

export interface CommandLimitPolicy {
  aiRequestsPerDay: number;
  aiRequestsPerHour: number;
  voiceSecondsPerMonth: number;
  voiceWordsPerWeek: number;
  deepBrunoPerMonth: number;
  connectedSources: number | 'unlimited';
  automaticSourceRefresh: boolean;
}

/**
 * Per-plan Command limits (§27). Start conservative; raise once telemetry proves
 * margins. `trialing`/`canceled` map onto `premium`/`free` respectively.
 */
export const COMMAND_LIMITS: Record<'free' | 'student' | 'premium', CommandLimitPolicy> = {
  free: {
    aiRequestsPerDay: 5,
    aiRequestsPerHour: 2,
    voiceSecondsPerMonth: 3600,
    voiceWordsPerWeek: 2000,
    deepBrunoPerMonth: 0,
    connectedSources: 1,
    automaticSourceRefresh: false,
  },
  student: {
    aiRequestsPerDay: 100,
    aiRequestsPerHour: 20,
    voiceSecondsPerMonth: 18000,
    voiceWordsPerWeek: 20000,
    deepBrunoPerMonth: 10,
    connectedSources: 3,
    automaticSourceRefresh: true,
  },
  premium: {
    aiRequestsPerDay: 100,
    aiRequestsPerHour: 20,
    voiceSecondsPerMonth: 60000,
    voiceWordsPerWeek: 50000,
    deepBrunoPerMonth: 20,
    connectedSources: 'unlimited',
    automaticSourceRefresh: true,
  },
};

/** Resolve the applicable Command limit policy for a normalized plan type. */
export function limitPolicyForPlan(plan: PlanType): CommandLimitPolicy {
  switch (plan) {
    case 'student':
      return COMMAND_LIMITS.student;
    case 'premium':
    case 'trialing':
    case 'admin':
      return COMMAND_LIMITS.premium;
    case 'free':
    case 'canceled':
    default:
      return COMMAND_LIMITS.free;
  }
}

export type CommandUsageDecision =
  | { allowed: true; plan: PlanType; usageLogId?: string }
  | {
      allowed: false;
      plan?: PlanType;
      reason: string;
      message: string;
      resetAt?: string;
      remainingToday?: number;
    };

/**
 * Atomically reserve one Command AI request for `userId` against the shared cap.
 * MUST be called (and return `allowed: true`) BEFORE any provider call — over-limit
 * free users are rejected before the model runs (§14.7). `requestId` makes the
 * reservation idempotent across retries.
 */
export async function reserveCommandAiRequest(
  userId: string,
  feature: CommandUsageFeature,
  email?: string | null,
  requestId?: string,
): Promise<CommandUsageDecision> {
  const result: RateLimitResult = await checkRateLimitForUser(
    userId,
    feature,
    email,
    requestId,
  );

  if (result.allowed) {
    return { allowed: true, plan: result.plan, usageLogId: result.usageLogId };
  }

  return {
    allowed: false,
    plan: result.plan,
    reason: result.limitType ?? result.error ?? 'rate_limited',
    message:
      result.message ??
      "You have used today's free cleanups. You can still add responsibilities manually.",
    resetAt: result.resetAt,
    remainingToday:
      result.limit != null && result.used != null
        ? Math.max(0, result.limit - result.used)
        : undefined,
  };
}
