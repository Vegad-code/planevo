import { createClient } from '@/lib/supabase/server';

export type PlanType = 'free' | 'pro' | 'team' | 'elite';

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

  return { 
    plan: profile.plan_type as PlanType, 
    user, 
    isPro: profile.plan_type === 'pro' || profile.plan_type === 'elite',
    isElite: profile.plan_type === 'elite'
  };
}
