/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from 'stripe';
import { readRequiredEnv } from './env';

const STRIPE_SECRET_KEY = readRequiredEnv(process.env, 'STRIPE_SECRET_KEY');

/**
 * Stripe SDK singleton — server-side only.
 * Never import this file from client components.
 */
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia' as any,
  typescript: true,
});

// ---------------------------------------------------------------------------
// Price IDs — set these in .env.local after creating products in Stripe Dashboard
// ---------------------------------------------------------------------------
export const PRICE_IDS = {
  MONTHLY: readRequiredEnv(process.env, 'STRIPE_PRICE_MONTHLY'),
  ANNUAL: readRequiredEnv(process.env, 'STRIPE_PRICE_ANNUAL'),
  STUDENT: readRequiredEnv(process.env, 'STRIPE_PRICE_STUDENT'),
} as const;

// ---------------------------------------------------------------------------
// Plan type mapping — keeps DB values and Stripe metadata in sync
// ---------------------------------------------------------------------------
export type PlanType = 'free' | 'trialing' | 'premium' | 'student' | 'canceled' | 'admin';

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
      if (priceId === PRICE_IDS.STUDENT) return 'student';
      return 'premium';
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return 'free';
    default:
      return 'free';
  }
}
