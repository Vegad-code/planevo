import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

/**
 * Stripe SDK singleton — server-side only.
 * Never import this file from client components.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia' as any,
  typescript: true,
});

// ---------------------------------------------------------------------------
// Price IDs — set these in .env.local after creating products in Stripe Dashboard
// ---------------------------------------------------------------------------
export const PRICE_IDS = {
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY!,
  ANNUAL: process.env.STRIPE_PRICE_ANNUAL!,
} as const;

// ---------------------------------------------------------------------------
// Plan type mapping — keeps DB values and Stripe metadata in sync
// ---------------------------------------------------------------------------
export type PlanType = 'free' | 'trialing' | 'premium' | 'canceled' | 'admin';

export function subscriptionStatusToPlanType(
  status: Stripe.Subscription.Status,
  priceId?: string
): PlanType {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
    case 'past_due':
    case 'incomplete':
      return 'premium';
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return 'canceled';
    default:
      return 'free';
  }
}
