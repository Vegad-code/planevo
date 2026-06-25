'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isFreeLikePlan, isPaidPlan, normalizePlanType, type PlanType } from '@/lib/auth/plan-types';

interface SubscriptionState {
  planType: PlanType;
  subscriptionStatus: string;
  trialEnd: string | null;
  isActive: boolean;
  isTrialing: boolean;
  isFree: boolean;
  loading: boolean;
}

/**
 * Hook to check the current user's subscription state.
 * Reads directly from the `users` table — no Stripe API calls.
 */
export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    planType: 'free',
    subscriptionStatus: 'none',
    trialEnd: null,
    isActive: false,
    isTrialing: false,
    isFree: true,
    loading: true,
  });

  useEffect(() => {
    async function fetchSubscription() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('users')
        .select('plan_type, subscription_status, trial_end')
        .eq('id', user.id)
        .single();

      if (profile) {
        const planType = normalizePlanType(profile.plan_type);
        const isOwner = planType === 'admin';
        
        // Only the owner can be 'admin'
        const effectivePlan = (planType === 'admin' && !isOwner) ? 'free' as PlanType : planType;
        
        const isActive = isPaidPlan(effectivePlan, isOwner);
        const isTrialing = effectivePlan === 'trialing';

        setState({
          planType: effectivePlan,
          subscriptionStatus: profile.subscription_status || 'none',
          trialEnd: profile.trial_end,
          isActive,
          isTrialing,
          isFree: isFreeLikePlan(effectivePlan),
          loading: false,
        });
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    }

    fetchSubscription();
  }, []);

  return state;
}

/**
 * Redirects the user to Stripe Checkout for a new subscription.
 */
export async function redirectToCheckout(
  interval: 'monthly' | 'annual' = 'monthly',
  options: { source?: string; returnPath?: string } = {}
) {
  const { posthog } = await import('@/lib/posthog');
  posthog.capture('checkout_started', { interval, source: options.source });

  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      interval,
      source: options.source,
      returnPath: options.returnPath,
    }),
  });

  const data = await res.json();

  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || 'Failed to create checkout session');
  }
}

/**
 * Redirects the user to the Stripe Customer Portal to manage their subscription.
 */
export async function redirectToPortal() {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (data.url) {
    window.location.href = data.url;
  } else {
    throw new Error(data.error || 'Failed to create portal session');
  }
}
