import { createClient } from '@/lib/supabase/server';

export const OWNER_EMAIL = 'jabbouranthony720@gmail.com';

export type PlanType = 'free' | 'trialing' | 'premium' | 'canceled' | 'admin';

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

  const rawPlan = profile.plan_type as PlanType;
  const isOwner = user.email === OWNER_EMAIL;
  const plan = (rawPlan === 'admin' && !isOwner) ? 'free' : rawPlan;

  return { 
    plan, 
    user, 
    isPremium: plan === 'premium' || plan === 'trialing' || (plan === 'admin' && isOwner),
    isTrialing: plan === 'trialing',
    isAdmin: plan === 'admin' && isOwner
  };
}
