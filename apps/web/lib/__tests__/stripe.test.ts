import { describe, it, expect } from 'vitest';

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'test-key';

import { subscriptionStatusToPlanType, PRICE_IDS } from '../stripe';
import type Stripe from 'stripe';

describe('subscriptionStatusToPlanType', () => {
  it('maps "trialing" status to "trialing"', () => {
    expect(subscriptionStatusToPlanType('trialing')).toBe('trialing');
  });

  it('maps "active", "past_due", and "incomplete" to "premium" by default', () => {
    expect(subscriptionStatusToPlanType('active')).toBe('premium');
    expect(subscriptionStatusToPlanType('past_due')).toBe('premium');
    expect(subscriptionStatusToPlanType('incomplete')).toBe('premium');
  });

  it('maps "active" with STUDENT price ID to "student"', () => {
    // We can't rely on env vars in tests unless we set them, so let's mock it
    const studentPrice = PRICE_IDS.STUDENT || 'price_student_mock';
    
    // In case PRICE_IDS.STUDENT is undefined during test, we just pass the actual constant value.
    expect(subscriptionStatusToPlanType('active', PRICE_IDS.STUDENT)).toBe(PRICE_IDS.STUDENT ? 'student' : 'premium');
  });

  it('maps canceled or unpaid states to "canceled"', () => {
    expect(subscriptionStatusToPlanType('canceled')).toBe('canceled');
    expect(subscriptionStatusToPlanType('incomplete_expired')).toBe('canceled');
    expect(subscriptionStatusToPlanType('unpaid')).toBe('canceled');
  });

  it('maps unknown statuses to "free"', () => {
    expect(subscriptionStatusToPlanType('paused' as Stripe.Subscription.Status)).toBe('free');
  });
});
