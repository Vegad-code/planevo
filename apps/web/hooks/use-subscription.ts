'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PlanType } from '@/lib/stripe';

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

      const { data: profile } = await supabase
        .from('users')
        .select('plan_type, subscription_status, trial_end')
        .eq('id', user.id)
        .single();

      if (profile) {
        const planType = (profile.plan_type || 'free') as PlanType;
        const isActive = ['pro_monthly', 'pro_annual'].includes(planType);
        const isTrialing = planType === 'trialing';

        setState({
          planType,
          subscriptionStatus: profile.subscription_status || 'none',
          trialEnd: profile.trial_end,
          isActive: isActive || isTrialing,
          isTrialing,
          isFree: planType === 'free',
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
export async function redirectToCheckout(interval: 'monthly' | 'annual' = 'monthly') {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval }),
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
