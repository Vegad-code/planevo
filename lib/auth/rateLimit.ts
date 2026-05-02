import { createClient } from '@/lib/supabase/server';
import { getUserPlan } from './subscription';

// Define the daily limits for each plan
// Free: 5/day — enough to build habit, not enough to avoid upgrading
// Pro:  100/day — effectively unlimited for normal students
// Elite: 1000/day — true unlimited for power users & agents
export const AI_DAILY_LIMITS = {
  free: 5,
  pro: 100,
  team: 200,
  elite: 1000,
} as const;

export async function checkRateLimit(feature: string) {
  const { plan, user, error: planError } = await getUserPlan();

  if (planError || !user) {
    return { allowed: false, error: 'Unauthorized' };
  }

  const limit = AI_DAILY_LIMITS[plan] || AI_DAILY_LIMITS.free;
  const supabase = await createClient();

  // Atomically consumes one quota unit before the AI call. The RPC locks per user,
  // counts the last 24 hours, and inserts the usage log in the same transaction.
  let allowed = false;
  try {
    const { data, error: limitError } = await supabase.rpc('consume_ai_usage', {
      p_user_id: user.id,
      p_feature: feature,
      p_limit: limit
    });
    
    if (limitError) {
      console.error('Rate limit RPC error:', limitError);
      return {
        allowed: false,
        error: 'Rate Limit Unavailable',
        message: 'AI usage checks are temporarily unavailable. Please try again shortly.'
      };
    } else {
      allowed = !!data;
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

  return { allowed: true, userId: user.id, plan };
}

/**
 * Logs AI usage to the database.
 *
 * Prefer checkRateLimit() for new AI endpoints. It atomically consumes quota
 * before the provider call, which prevents parallel request quota races.
 */
export async function logAiUsage(userId: string, feature: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('ai_usage_logs').insert({
    user_id: userId,
    feature: feature
  });

  if (error) {
    console.error('Failed to log AI usage:', error);
  }
}
