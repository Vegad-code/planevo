import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

const mocks = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  processedEvents: new Set<string>(),
  userUpdates: [] as Array<{ table: string; payload: Record<string, unknown>; column: string; value: string }>,
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'stripe-signature': 'test-signature' })),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: mocks.constructEventMock,
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  subscriptionStatusToPlanType: vi.fn((status: string, priceId?: string) => {
    if (status === 'trialing') return 'trialing';
    if (status === 'active' && priceId === 'price_student') return 'student';
    if (['active', 'past_due', 'incomplete'].includes(status)) return 'premium';
    return 'free';
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'stripe_webhook_events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, eventId: string) => ({
              maybeSingle: vi.fn(async () => ({
                data: mocks.processedEvents.has(eventId) ? { id: eventId } : null,
                error: null,
              })),
            })),
          })),
          insert: vi.fn(async (row: { id: string }) => {
            mocks.processedEvents.add(row.id);
            return { error: null };
          }),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'user_123' }, error: null })),
          })),
        })),
        update: vi.fn((payload: Record<string, unknown>) => ({
          eq: vi.fn(async (column: string, value: string) => {
            mocks.userUpdates.push({ table, payload, column, value });
            return { error: null };
          }),
        })),
      };
    }),
  },
}));

vi.mock('@/lib/posthog-server', () => ({
  posthogServer: {
    capture: vi.fn(),
  },
}));

vi.mock('@/lib/email', () => ({
  buildEmailIdempotencyKey: vi.fn(() => 'email-key'),
  sendPaymentFailedEmail: vi.fn(async () => 'email-id'),
  sendSubscriptionReceiptEmail: vi.fn(async () => 'email-id'),
}));

vi.mock('@/lib/notifications/preferences', () => ({
  canSendNotification: vi.fn(() => false),
}));

vi.mock('@/lib/notifications/expo', () => ({
  sendExpoPushNotification: vi.fn(),
}));

vi.mock('@/lib/notifications/delivery', () => ({
  hasNotificationDelivery: vi.fn(async () => false),
  recordNotificationDelivery: vi.fn(async () => undefined),
}));

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    body: 'mock body',
  });
}

describe('Stripe Webhook API', () => {
  beforeEach(() => {
    mocks.constructEventMock.mockReset();
    mocks.processedEvents.clear();
    mocks.userUpdates.length = 0;
  });

  it('reverts canceled subscriptions to the free plan', async () => {
    mocks.constructEventMock.mockReturnValue({
      id: 'evt_cancel',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
        },
      },
    });

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mocks.userUpdates).toContainEqual({
      table: 'users',
      column: 'stripe_customer_id',
      value: 'cus_123',
      payload: {
        plan_type: 'free',
        subscription_status: 'canceled',
        stripe_subscription_id: null,
        stripe_price_id: null,
        stripe_current_period_end: null,
      },
    });
    expect(mocks.processedEvents.has('evt_cancel')).toBe(true);
  });

  it('skips already processed events without mutating users again', async () => {
    mocks.processedEvents.add('evt_duplicate');
    mocks.constructEventMock.mockReturnValue({
      id: 'evt_duplicate',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
        },
      },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(mocks.userUpdates).toHaveLength(0);
  });
});
