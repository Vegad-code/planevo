'use client';

import { useMemo } from 'react';
import { useUserProfileOptional } from '@/components/providers/UserProfileProvider';
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
 * Reads from UserProfileProvider when inside dashboard; otherwise falls back to a one-time fetch.
 */
export function useSubscription(): SubscriptionState {
  const cached = useUserProfileOptional();

  return useMemo((): SubscriptionState => {
    if (!cached) {
      return {
        planType: 'free',
        subscriptionStatus: 'none',
        trialEnd: null,
        isActive: false,
        isTrialing: false,
        isFree: true,
        loading: true,
      };
    }

    const planType = normalizePlanType(cached.profile.plan_type);
    const isOwner = planType === 'admin';
    const effectivePlan = planType === 'admin' && !isOwner ? ('free' as PlanType) : planType;
    const isActive = isPaidPlan(effectivePlan, isOwner);
    const isTrialing = effectivePlan === 'trialing';

    return {
      planType: effectivePlan,
      subscriptionStatus: cached.profile.subscription_status || 'none',
      trialEnd: cached.profile.trial_end,
      isActive,
      isTrialing,
      isFree: isFreeLikePlan(effectivePlan),
      loading: false,
    };
  }, [cached]);
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
