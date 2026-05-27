import { supabaseAdmin } from '@/lib/supabase/admin';
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

/** Rate-limit check for cookie-authenticated web requests */
export async function checkRateLimit(feature: string) {
  const { plan, user, error: planError } = await getUserPlan();

  if (planError || !user) {
    return { allowed: false, error: 'Unauthorized' };
  }

  return _consumeQuota(user.id, feature, plan);
}

/** Pre-validation rate-limit check without consuming quota (for Bruno Chat) */
export async function validateHourlyRateLimit(userId: string, feature: string) {
  const { plan } = await getUserPlanById(userId);
  const limit = AI_HOURLY_LIMITS[plan] || AI_HOURLY_LIMITS.free;

  try {
    const { count, error: countError } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', feature)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (countError) throw countError;

    if ((count ?? 0) >= limit) {
      return { 
        allowed: false, 
        error: 'Rate Limit Reached', 
        message: `You have reached your hourly limit of ${limit} requests. Please try again later.`,
        plan
      };
    }
    return { allowed: true, userId, plan };
  } catch (err) {
    console.error('Hourly rate limit validation failed:', err);
    return { allowed: false, error: 'Rate Limit Unavailable' };
  }
}

/** Consumes the quota after a successful action (for Bruno Chat) */
export async function consumeHourlyRateLimit(userId: string, feature: string) {
  return logAiUsage(userId, feature);
}

/** Rate-limit check for Bearer-token-authenticated mobile requests */
export async function checkRateLimitForUser(userId: string, feature: string, email?: string | null) {
  const { plan } = await getUserPlanById(userId, email);
  return _consumeQuota(userId, feature, plan);
}

async function _consumeQuota(userId: string, feature: string, plan: PlanType) {
  const limit = AI_DAILY_LIMITS[plan] || AI_DAILY_LIMITS.free;

  // Use admin client to bypass RLS for the consume_ai_usage RPC
  let allowed = false;
  try {
    // Direct count + insert via admin client to avoid RLS auth.uid() checks
    const { count, error: countError } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', feature)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (countError) {
      console.error('Rate limit count error:', countError);
      return {
        allowed: false,
        error: 'Rate Limit Unavailable',
        message: 'AI usage checks are temporarily unavailable. Please try again shortly.'
      };
    }

    if ((count ?? 0) >= limit) {
      allowed = false;
    } else {
      // Insert usage log
      const { error: insertError } = await supabaseAdmin
        .from('ai_usage_logs')
        .insert({ user_id: userId, feature });

      if (insertError) {
        console.error('Rate limit insert error:', insertError);
        return {
          allowed: false,
          error: 'Rate Limit Unavailable',
          message: 'AI usage checks are temporarily unavailable. Please try again shortly.'
        };
      }
      allowed = true;
    }
  } catch (err) {
    console.error('Rate limit check failed:', err);
    return {
      allowed: false,
      error: 'Rate Limit Unavailable',
      message: 'AI usage checks are temporarily unavailable. Please try again shortly.'
    };
  }

  if (!allowed) {
    return { 
      allowed: false, 
      error: 'Limit Reached', 
      message: `You have reached your daily limit of ${limit} AI requests for the ${plan} plan. Updates reset every 24 hours.`
    };
  }

  return { allowed: true, userId, plan };
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
