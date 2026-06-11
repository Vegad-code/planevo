import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePlanType, type PlanType } from './plan-types';

// Re-export for consumers
export { normalizePlanType, type PlanType } from './plan-types';

export const OWNER_EMAIL = 'jabbouranthony720@gmail.com';

function resolvePlan(rawPlan: PlanType, email?: string | null) {
  const isOwner = email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const plan = (rawPlan === 'admin' && !isOwner) ? 'free' as PlanType : rawPlan;
  return {
    plan,
    isPremium: plan === 'premium' || plan === 'trialing' || plan === 'student' || (plan === 'admin' && isOwner),
    isTrialing: plan === 'trialing',
    isAdmin: plan === 'admin' && isOwner,
  };
}

/** Get user plan from cookie session (web) */
export async function getUserPlan() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { plan: 'free' as PlanType, user: null, error: 'Unauthorized' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('plan_type')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { plan: 'free' as PlanType, user, error: 'Profile not found' };
  }

  const normalized = normalizePlanType(profile.plan_type);
  const resolved = resolvePlan(normalized, user.email);

  return { ...resolved, user };
}

/** Get user plan by user ID (for Bearer-token-authenticated mobile requests) */
export async function getUserPlanById(userId: string, email?: string | null) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('plan_type')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { plan: 'free' as PlanType, error: 'Profile not found' };
  }

  const normalized = normalizePlanType(profile.plan_type);
  return resolvePlan(normalized, email);
}
