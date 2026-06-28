import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BrunoRateLimitPayload } from '@/lib/bruno/types';
import { getUserPlan, getUserPlanById, type PlanType } from './subscription';

// Define the daily limits for each plan
// Free: 5/day — enough to build habit, not enough to avoid upgrading
// Trialing/Premium/Student: 100/day — effectively unlimited for normal students
// Admin: 1000/day — true unlimited for power users & agents
export const AI_DAILY_LIMITS: Record<PlanType, number> = {
  free: 5,
  trialing: 100,
  premium: 100,
  student: 100,
  admin: 1000,
  canceled: 5,
};

// Define the hourly limits for each plan to prevent burst abuse
export const AI_HOURLY_LIMITS: Record<PlanType, number> = {
  free: 2,
  trialing: 20,
  premium: 20,
  student: 20,
  admin: 100,
  canceled: 2,
};

type RateLimitSuccess = {
  allowed: true;
  userId: string;
  plan: PlanType;
  usageLogId?: string;
};

type RateLimitDenied = {
  allowed: false;
  error: string;
  message?: string;
  plan?: PlanType;
  limitType?: BrunoRateLimitPayload['limitType'];
  used?: number;
  limit?: number;
  resetAt?: string;
};

export type RateLimitResult = RateLimitSuccess | RateLimitDenied;

function featureKey(feature: string): string {
  return feature.slice(0, 100);
}

/** Oldest log in rolling window + window duration; falls back to now + window if empty. */
export async function getQuotaResetAt(
  userId: string,
  feature: string,
  windowHours: number
): Promise<string> {
  const windowMs = windowHours * 60 * 60 * 1000;
  const since = new Date(Date.now() - windowMs).toISOString();

  const { data, error } = await supabaseAdmin
    .from('ai_usage_logs')
    .select('created_at')
    .eq('user_id', userId)
    .eq('feature', featureKey(feature))
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !data?.[0]?.created_at) {
    return new Date(Date.now() + windowMs).toISOString();
  }

  const oldestMs = new Date(data[0].created_at).getTime();
  return new Date(oldestMs + windowMs).toISOString();
}

async function getUsageCountInWindow(
  userId: string,
  feature: string,
  windowHours: number
): Promise<number> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from('ai_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', featureKey(feature))
    .gte('created_at', since);

  if (error) throw error;
  return count ?? 0;
}

async function buildRateLimitDenied(
  userId: string,
  feature: string,
  limitType: BrunoRateLimitPayload['limitType'],
  limit: number,
  used: number,
  plan: PlanType,
  windowHours: number
): Promise<BrunoRateLimitPayload> {
  const resetAt = await getQuotaResetAt(userId, feature, windowHours);
  const message =
    limitType === 'daily'
      ? `You have reached your daily limit of ${limit} AI requests for the ${plan} plan. Updates reset every 24 hours.`
      : `You have reached your hourly limit of ${limit} requests. Please try again later.`;

  return {
    error: 'rate_limit_reached',
    limitType,
    message,
    used,
    limit,
    plan,
    resetAt,
  };
}

/** Rate-limit check for cookie-authenticated web requests */
export async function checkRateLimit(feature: string) {
  const { plan, user, error: planError } = await getUserPlan();

  if (planError || !user) {
    return { allowed: false, error: 'Unauthorized' };
  }

  return _consumeQuota(user.id, feature, plan);
}

/** Pre-validation rate-limit check without consuming quota (for Bruno Chat) */
export async function validateHourlyRateLimit(
  userId: string,
  feature: string,
  email?: string | null
): Promise<RateLimitResult> {
  const { plan } = await getUserPlanById(userId, email);
  const limit = AI_HOURLY_LIMITS[plan] || AI_HOURLY_LIMITS.free;

  try {
    const used = await getUsageCountInWindow(userId, feature, 1);

    if (used >= limit) {
      const denied = await buildRateLimitDenied(
        userId,
        feature,
        'hourly',
        limit,
        used,
        plan,
        1
      );
      return {
        allowed: false,
        ...denied,
      };
    }
    return { allowed: true, userId, plan };
  } catch (err) {
    console.error('Hourly rate limit validation failed:', err);
    return { allowed: false, error: 'Rate Limit Unavailable' };
  }
}

/** Rate-limit check for Bearer-token-authenticated mobile requests */
export async function checkRateLimitForUser(
  userId: string,
  feature: string,
  email?: string | null,
  requestId?: string
): Promise<RateLimitResult> {
  const { plan } = await getUserPlanById(userId, email);
  return _consumeQuota(userId, feature, plan, requestId);
}

async function consumeAiUsageFallback(
  userId: string,
  feature: string,
  limit: number,
  requestId?: string
): Promise<{ allowed: boolean; usageLogId?: string }> {
  const key = featureKey(feature);

  if (requestId) {
    const { data: existing } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('id')
      .eq('request_id', requestId)
      .maybeSingle();
    if (existing?.id) {
      return { allowed: true, usageLogId: existing.id };
    }
  }

  const { count, error: countError } = await supabaseAdmin
    .from('ai_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', key)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (countError) throw countError;
  if ((count ?? 0) >= limit) {
    return { allowed: false };
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('ai_usage_logs')
    .insert({
      user_id: userId,
      feature: key,
      ...(requestId ? { request_id: requestId, status: 'reserved' } : {}),
    })
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505' && requestId) {
      const { data: existing } = await supabaseAdmin
        .from('ai_usage_logs')
        .select('id')
        .eq('request_id', requestId)
        .maybeSingle();
      if (existing?.id) {
        return { allowed: true, usageLogId: existing.id };
      }
    }
    throw insertError;
  }

  return { allowed: true, usageLogId: inserted.id };
}

async function buildDailyRateLimitDenied(
  userId: string,
  feature: string,
  plan: PlanType,
  limit: number
): Promise<BrunoRateLimitPayload> {
  const used = await getUsageCountInWindow(userId, feature, 24);
  return buildRateLimitDenied(userId, feature, 'daily', limit, used, plan, 24);
}

async function _consumeQuota(
  userId: string,
  feature: string,
  plan: PlanType,
  requestId?: string
): Promise<RateLimitResult> {
  const limit = AI_DAILY_LIMITS[plan] || AI_DAILY_LIMITS.free;

  try {
    const { data, error } = await supabaseAdmin.rpc('consume_ai_usage_admin', {
      p_user_id: userId,
      p_feature: featureKey(feature),
      p_daily_limit: limit,
      p_request_id: requestId ?? null,
    });

    if (error) {
      console.error('Rate limit RPC error:', error);
      if (error.code === 'PGRST202') {
        try {
          const fallback = await consumeAiUsageFallback(
            userId,
            feature,
            limit,
            requestId
          );
          if (!fallback.allowed) {
            const denied = await buildDailyRateLimitDenied(
              userId,
              feature,
              plan,
              limit
            );
            return {
              allowed: false,
              ...denied,
            };
          }
          return {
            allowed: true,
            userId,
            plan,
            usageLogId: fallback.usageLogId,
          };
        } catch (fallbackErr) {
          console.error('Rate limit fallback failed:', fallbackErr);
        }
      }
      return {
        allowed: false,
        error: 'Rate Limit Unavailable',
        message: 'AI usage checks are temporarily unavailable. Please try again shortly.',
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.allowed) {
      const denied = await buildDailyRateLimitDenied(userId, feature, plan, limit);
      return {
        allowed: false,
        ...denied,
      };
    }

    return {
      allowed: true,
      userId,
      plan,
      usageLogId: row.usage_log_id as string,
    };
  } catch (err) {
    console.error('Rate limit check failed:', err);
    return {
      allowed: false,
      error: 'Rate Limit Unavailable',
      message: 'AI usage checks are temporarily unavailable. Please try again shortly.',
    };
  }
}

/**
 * Logs AI usage to the database.
 */
export async function logAiUsage(userId: string, feature: string) {
  const { error } = await supabaseAdmin.from('ai_usage_logs').insert({
    user_id: userId,
    feature: feature
  });

  if (error) {
    console.error('Failed to log AI usage:', error);
  }
}

export const BRUNO_NOTES_MONTHLY_LIMITS: Record<PlanType, number | null> = {
  free: Number(process.env.BRUNO_NOTES_FREE_MONTHLY_LIMIT ?? 8),
  trialing: null,
  premium: null,
  student: null,
  admin: null,
  canceled: Number(process.env.BRUNO_NOTES_FREE_MONTHLY_LIMIT ?? 8),
};

const BRUNO_NOTES_FEATURE = 'bruno-notes';

export const BRUNO_DOCUMENTS_MONTHLY_LIMITS: Record<PlanType, number | null> = {
  free: Number(process.env.BRUNO_DOCUMENTS_FREE_MONTHLY_LIMIT ?? 8),
  trialing: null,
  premium: null,
  student: null,
  admin: null,
  canceled: Number(process.env.BRUNO_DOCUMENTS_FREE_MONTHLY_LIMIT ?? 8),
};

const BRUNO_DOCUMENTS_FEATURE = 'bruno-documents';

function monthlyLimitForPlan(
  limits: Record<PlanType, number | null>,
  plan: PlanType
): number | null {
  return Object.prototype.hasOwnProperty.call(limits, plan)
    ? limits[plan]
    : limits.free;
}

/** Monthly notes quota for free users. Pro returns allowed: true without consuming. */
export async function checkBrunoNotesMonthlyQuota(
  userId: string,
  email?: string | null
): Promise<{
  allowed: boolean;
  error?: string;
  message?: string;
  remaining?: number;
  limit?: number;
}> {
  const { plan } = await getUserPlanById(userId, email);
  const limit = monthlyLimitForPlan(BRUNO_NOTES_MONTHLY_LIMITS, plan);

  if (limit === null) {
    return { allowed: true };
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', BRUNO_NOTES_FEATURE)
      .gte('created_at', thirtyDaysAgo);

    if (error) throw error;

    const used = count ?? 0;
    if (used >= limit) {
      return {
        allowed: false,
        error: 'Notes Limit Reached',
        message: `You've used your ${limit} free note sessions this month. Upgrade for unlimited notes with Deep Bruno, or try again next month.`,
        remaining: 0,
        limit,
      };
    }

    return { allowed: true, remaining: limit - used, limit };
  } catch (err) {
    console.error('Bruno notes quota check failed:', err);
    return {
      allowed: false,
      error: 'Rate Limit Unavailable',
      message: 'Notes usage checks are temporarily unavailable. Please try again shortly.',
    };
  }
}

export async function consumeBrunoNotesQuota(
  userId: string,
  requestId?: string
): Promise<{ ok: boolean }> {
  try {
    if (requestId) {
      const { data: existing } = await supabaseAdmin
        .from('ai_usage_logs')
        .select('id')
        .eq('request_id', requestId)
        .eq('feature', BRUNO_NOTES_FEATURE)
        .maybeSingle();
      if (existing?.id) {
        return { ok: true };
      }
    }

    const { error } = await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: userId,
      feature: BRUNO_NOTES_FEATURE,
      ...(requestId ? { request_id: `${requestId}-notes`, status: 'completed' } : {}),
    });

    if (error) {
      console.error('Failed to consume Bruno notes quota:', error);
      return { ok: false };
    }

    return { ok: true };
  } catch (err) {
    console.error('Failed to consume Bruno notes quota:', err);
    return { ok: false };
  }
}

/** Monthly document-writing quota for free users. Pro returns allowed: true. */
export async function checkBrunoDocumentsMonthlyQuota(
  userId: string,
  email?: string | null
): Promise<{
  allowed: boolean;
  error?: string;
  message?: string;
  remaining?: number;
  limit?: number;
}> {
  const { plan } = await getUserPlanById(userId, email);
  const limit = monthlyLimitForPlan(BRUNO_DOCUMENTS_MONTHLY_LIMITS, plan);

  if (limit === null) {
    return { allowed: true };
  }

  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { count, error } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', BRUNO_DOCUMENTS_FEATURE)
      .gte('created_at', thirtyDaysAgo);

    if (error) throw error;

    const used = count ?? 0;
    if (used >= limit) {
      return {
        allowed: false,
        error: 'Documents Limit Reached',
        message: `You've used your ${limit} free document-writing sessions this month. Upgrade for longer document drafts with Deep Bruno, or try again next month.`,
        remaining: 0,
        limit,
      };
    }

    return { allowed: true, remaining: limit - used, limit };
  } catch (err) {
    console.error('Bruno documents quota check failed:', err);
    return {
      allowed: false,
      error: 'Rate Limit Unavailable',
      message:
        'Document-writing usage checks are temporarily unavailable. Please try again shortly.',
    };
  }
}

export async function consumeBrunoDocumentsQuota(
  userId: string,
  requestId?: string
): Promise<{ ok: boolean }> {
  try {
    const documentRequestId = requestId
      ? `${requestId}-documents`
      : undefined;

    if (documentRequestId) {
      const { data: existing } = await supabaseAdmin
        .from('ai_usage_logs')
        .select('id')
        .eq('request_id', documentRequestId)
        .eq('feature', BRUNO_DOCUMENTS_FEATURE)
        .maybeSingle();
      if (existing?.id) {
        return { ok: true };
      }
    }

    const { error } = await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: userId,
      feature: BRUNO_DOCUMENTS_FEATURE,
      ...(documentRequestId
        ? { request_id: documentRequestId, status: 'completed' }
        : {}),
    });

    if (error) {
      console.error('Failed to consume Bruno documents quota:', error);
      return { ok: false };
    }

    return { ok: true };
  } catch (err) {
    console.error('Failed to consume Bruno documents quota:', err);
    return { ok: false };
  }
}
