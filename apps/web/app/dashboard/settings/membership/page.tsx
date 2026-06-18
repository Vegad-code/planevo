import MembershipActions from '@/components/settings/MembershipActions';
import { isFreeLikePlan, isPaidPlan, normalizePlanType } from '@/lib/auth/plan-types';
import { createClient } from '@/lib/supabase/server';
import { PRICE_IDS, stripe } from '@/lib/stripe';
import Stripe from 'stripe';

type MembershipProfile = {
  plan_type: string | null;
  subscription_status: string | null;
  trial_end: string | null;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
};

function formatDate(value: string | number | null | undefined) {
  if (!value) return 'Not scheduled';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatStatus(status: string | null | undefined) {
  switch (status) {
    case 'trialing':
      return 'Trialing';
    case 'active':
      return 'Active';
    case 'past_due':
      return 'Past due - update payment method';
    case 'incomplete':
      return 'Checkout incomplete';
    case 'canceled':
      return 'Canceled';
    case 'unpaid':
      return 'Unpaid';
    default:
      return 'No paid subscription';
  }
}

function describePrice(priceId: string | null | undefined) {
  if (priceId === PRICE_IDS.ANNUAL) return '$79/year';
  if (priceId === PRICE_IDS.STUDENT) return '$4.99/month student';
  if (priceId === PRICE_IDS.MONTHLY) return '$9.99/month';
  return 'Free';
}

function getTrialDaysRemaining(trialEnd: string) {
  return Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default async function MembershipSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('plan_type, subscription_status, trial_end, email, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_current_period_end')
    .eq('id', user.id)
    .single();

  const profile = data as MembershipProfile | null;
  const isOwner = (profile?.email || user.email)?.toLowerCase() === 'jabbouranthony720@gmail.com';
  const planType = normalizePlanType(profile?.plan_type);
  const effectivePlan = (planType === 'admin' && !isOwner) ? 'free' : planType;
  const isFree = isFreeLikePlan(effectivePlan);
  const isPaid = isPaidPlan(effectivePlan, isOwner);
  const isTrialing = effectivePlan === 'trialing';

  let liveSubscription: Stripe.Subscription | null = null;
  if (profile?.stripe_subscription_id) {
    try {
      liveSubscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    } catch (error) {
      console.error('[Membership] Failed to fetch live Stripe subscription:', error);
    }
  }

  const liveSubscriptionPeriodEnd = liveSubscription
    ? (liveSubscription as Stripe.Subscription & { current_period_end?: number }).current_period_end
    : null;
  const currentPriceId = liveSubscription?.items.data[0]?.price?.id || profile?.stripe_price_id;
  const subscriptionStatus = liveSubscription?.status || profile?.subscription_status;
  const periodEnd = liveSubscriptionPeriodEnd || profile?.stripe_current_period_end;
  const cancelAtPeriodEnd = Boolean(liveSubscription?.cancel_at_period_end);

  const planName = isOwner && effectivePlan === 'admin'
    ? 'Admin Plan'
    : effectivePlan === 'student'
      ? 'Student Pro'
      : isPaid
        ? 'Planevo Pro'
        : 'Free Plan';

  const statusLabel = isTrialing && profile?.trial_end
    ? `${getTrialDaysRemaining(profile.trial_end)} trial days remaining`
    : cancelAtPeriodEnd
      ? `Canceling - Pro active until ${formatDate(periodEnd)}`
      : formatStatus(subscriptionStatus);

  const renewalLabel = isPaid
    ? cancelAtPeriodEnd
      ? formatDate(periodEnd)
      : subscriptionStatus === 'trialing'
        ? formatDate(profile?.trial_end)
        : formatDate(periodEnd)
    : 'Not applicable';

  const { count: activeTasksCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .or('completed.is.null,completed.eq.false');

  const { count: integrationsCount } = await supabase
    .from('integration_accounts_public' as 'integration_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const TASK_LIMIT = 50;
  const INTEGRATION_LIMIT = 1;
  const currentTasks = activeTasksCount || 0;
  const currentIntegrations = integrationsCount || 0;
  const tasksPercentage = isFree ? Math.min(100, (currentTasks / TASK_LIMIT) * 100) : 100;
  const integrationsPercentage = isFree ? Math.min(100, (currentIntegrations / INTEGRATION_LIMIT) * 100) : 100;

  return (
    <div className="space-y-8 animate-fade-in text-settings-text">
      <div>
        <h2 className="text-3xl font-serif italic text-settings-text mb-3">Membership</h2>
        <p className="text-sm font-medium text-settings-text-muted max-w-2xl leading-relaxed">
          Review your plan, upgrade to Pro, manage billing, or cancel your subscription.
        </p>
      </div>

      <div className="bg-settings-card rounded-2xl border border-settings-border p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-bold">{planName}</h3>
              {isPaid && !isTrialing && (
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
              {isFree
                ? 'You are on the free plan. Upgrade when you want unlimited planning power.'
                : statusLabel}
            </p>
          </div>

          <MembershipActions isFree={isFree} hasStripeCustomer={Boolean(profile?.stripe_customer_id)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Billing status', statusLabel],
            ['Price', isPaid ? describePrice(currentPriceId) : 'Free'],
            [cancelAtPeriodEnd ? 'Pro access ends' : subscriptionStatus === 'trialing' ? 'Trial ends' : 'Renews on', renewalLabel],
            ['Stripe customer', profile?.stripe_customer_id ? 'Connected' : 'Not connected'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-settings-border bg-settings-bg/50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-settings-text-muted mb-1">{label}</p>
              <p className="text-sm font-bold text-settings-text">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {isFree && (
        <div className="bg-settings-card rounded-2xl border border-settings-brand/30 p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-settings-brand mb-2">Why Pro</p>
              <h3 className="text-xl font-bold mb-2">Let Planevo keep planning when the semester gets loud.</h3>
              <p className="text-sm text-settings-text-muted leading-relaxed">
                Pro unlocks unlimited active tasks, unlimited integrations, deeper Bruno memory, and daily plan generation without the free-plan ceiling.
              </p>
            </div>
            <div className="rounded-xl bg-settings-bg/60 border border-settings-border p-4 space-y-3 text-sm font-medium">
              {['Unlimited active tasks', 'Unlimited integrations', 'Infinite Bruno memory', 'Priority planning features'].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-settings-brand" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-lg font-bold">Plan Limits</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                style={{ width: `${tasksPercentage}%` }}
              />
            </div>
          </div>

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
                style={{ width: `${integrationsPercentage}%` }}
              />
            </div>
          </div>

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
