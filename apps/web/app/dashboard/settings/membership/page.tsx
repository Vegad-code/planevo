import { createClient } from '@/lib/supabase/server';
import { normalizePlanType } from '@/lib/auth/plan-types';
import MembershipActions from '@/components/settings/MembershipActions';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export default async function MembershipSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch subscription details
  const { data: profile } = await supabase
    .from('users')
    .select('plan_type, subscription_status, trial_end, email, stripe_subscription_id')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.email?.toLowerCase() === 'jabbouranthony720@gmail.com';
  const planType = normalizePlanType(profile?.plan_type);
  const effectivePlan = (planType === 'admin' && !isOwner) ? 'free' : planType;

  // Treat canceled users as free if their period actually ended and webhook cleared the id,
  // or if we just want them to be able to upgrade.
  const isFree = effectivePlan === 'free' || effectivePlan === 'canceled';
  const isTrialing = effectivePlan === 'trialing';

  let planStatusLabel = 'Active';
  let planStatusValue = 'Free Plan';

  // Directly fetch from Stripe for live accurate states if possible
  let liveSubscription: Stripe.Subscription | null = null;
  if (profile?.stripe_subscription_id) {
    try {
      liveSubscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    } catch (e) {
      console.error('Failed to fetch live Stripe subscription in membership page:', e);
    }
  }

  if (isTrialing && profile?.trial_end) {
    const daysLeft = Math.max(0, Math.ceil((new Date(profile.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    planStatusLabel = 'Trial Status';
    planStatusValue = daysLeft > 0 ? `${daysLeft} days remaining` : 'Trial Ended';
  } else if (['premium', 'student', 'admin'].includes(effectivePlan) || effectivePlan === 'canceled') {
    planStatusValue = effectivePlan === 'student' ? 'Student Plan' : (effectivePlan === 'canceled' ? 'Canceled Plan' : 'Pro Plan');

    // Check Stripe live status first
    if (liveSubscription) {
      if (liveSubscription.cancel_at_period_end) {
        planStatusLabel = 'Status';
        const endDate = new Date((liveSubscription as any).current_period_end * 1000).toLocaleDateString();
        planStatusValue = `Canceled (Active until ${endDate})`;
      } else if (liveSubscription.status === 'past_due') {
        planStatusLabel = 'Status';
        planStatusValue = 'Past Due - Please update payment method';
      } else if (liveSubscription.status === 'active') {
        planStatusLabel = 'Renews on';
        planStatusValue = new Date((liveSubscription as any).current_period_end * 1000).toLocaleDateString();
      }
    } else {
      // Fallback to database
      if (profile?.subscription_status === 'past_due') {
        planStatusLabel = 'Status';
        planStatusValue = 'Past Due - Please update payment method';
      } else if (profile?.subscription_status === 'canceled') {
        planStatusLabel = 'Status';
        planStatusValue = 'Canceled';
      }
    }
  }

  // Fetch Limits Data
  // 1. Active Tasks (completed = false or null)
  const { count: activeTasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .or('completed.is.null,completed.eq.false');

  // 2. Active Integrations
  const { count: integrationsCount } = await supabase
    .from('integration_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const TASK_LIMIT = 50;
  const INTEGRATION_LIMIT = 1;
  const currentTasks = activeTasksCount || 0;
  const currentIntegrations = integrationsCount || 0;

  const tasksPercentage = isFree ? Math.min(100, (currentTasks / TASK_LIMIT) * 100) : (currentTasks > 0 ? 100 : 0);
  const integrationsPercentage = isFree ? Math.min(100, (currentIntegrations / INTEGRATION_LIMIT) * 100) : (currentIntegrations > 0 ? 100 : 0);

  return (
    <div className="space-y-8 animate-fade-in text-settings-text">
      <div>
        <h2 className="text-3xl font-serif italic text-settings-text mb-3">Membership</h2>
        <p className="text-sm font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          Manage your billing, subscription plan, and payment methods.
        </p>
      </div>

      {/* Current Plan Summary */}
      <div className="bg-settings-card rounded-2xl border border-settings-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold">{planStatusValue}</h3>
            {effectivePlan === 'premium' && (
              <span className="bg-settings-brand/10 text-settings-brand text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                PRO
              </span>
            )}
            {isTrialing && (
              <span className="bg-[var(--color-rose)]/10 text-[var(--color-rose)] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                TRIAL
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-settings-text-muted">
            {isFree ? 'You are currently on the free plan. Upgrade to unlock unlimited potential.' : `${planStatusLabel}`}
          </p>
        </div>

        <MembershipActions isFree={isFree} />
      </div>

      {/* Plan Limits */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold">Plan Limits</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Tasks Limit */}
          <div className="bg-settings-card rounded-2xl border border-settings-border p-6 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h4 className="font-bold mb-1">Active Tasks</h4>
                <p className="text-xs font-medium text-settings-text-muted">Uncompleted tasks</p>
              </div>
              <div className="text-sm font-bold">
                <span className={isFree && currentTasks >= TASK_LIMIT ? 'text-[var(--color-rose)]' : 'text-settings-text'}>
                  {currentTasks}
                </span>
                <span className="text-settings-text-muted">
                  {isFree ? ` / ${TASK_LIMIT}` : ' / Unlimited'}
                </span>
              </div>
            </div>
            <div className="h-2 w-full bg-settings-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isFree && currentTasks >= TASK_LIMIT ? 'bg-[var(--color-rose)]' : 'bg-settings-brand'}`}
                style={{ width: `${isFree ? tasksPercentage : 100}%` }}
              />
            </div>
          </div>

          {/* Integrations Limit */}
          <div className="bg-settings-card rounded-2xl border border-settings-border p-6 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h4 className="font-bold mb-1">Connected Integrations</h4>
                <p className="text-xs font-medium text-settings-text-muted">Canvas, Google Calendar, etc.</p>
              </div>
              <div className="text-sm font-bold">
                <span className={isFree && currentIntegrations >= INTEGRATION_LIMIT ? 'text-[var(--color-rose)]' : 'text-settings-text'}>
                  {currentIntegrations}
                </span>
                <span className="text-settings-text-muted">
                  {isFree ? ` / ${INTEGRATION_LIMIT}` : ' / Unlimited'}
                </span>
              </div>
            </div>
            <div className="h-2 w-full bg-settings-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isFree && currentIntegrations >= INTEGRATION_LIMIT ? 'bg-[var(--color-rose)]' : 'bg-[var(--color-ocean)]'}`}
                style={{ width: `${isFree ? integrationsPercentage : 100}%` }}
              />
            </div>
          </div>

          {/* AI Memory Rules Limit */}
          <div className="bg-settings-card rounded-2xl border border-settings-border p-6 shadow-sm md:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h4 className="font-bold mb-1">Bruno AI Memory</h4>
                <p className="text-xs font-medium text-settings-text-muted">Learned rules and preferences</p>
              </div>
              <div className="text-sm font-bold">
                {isFree ? (
                  <span className="px-2 py-1 bg-settings-bg rounded-md text-settings-text-muted text-xs">Basic (Limited)</span>
                ) : (
                  <span className="px-2 py-1 bg-settings-brand/10 text-settings-brand rounded-md text-xs">Infinite Memory</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
