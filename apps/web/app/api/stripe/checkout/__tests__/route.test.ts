import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('@/lib/stripe', () => ({
  PRICE_IDS: {
    MONTHLY: 'price_monthly',
    ANNUAL: 'price_annual',
    STUDENT: 'price_student',
  },
  stripe: {
    customers: {
      create: vi.fn(async () => ({ id: 'cus_new' })),
    },
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({ url: 'https://portal.stripe.com/session' })),
      },
    },
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ url: 'https://checkout.stripe.com/session' })),
      },
    },
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'user_123', email: 'test@example.com' } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
  })),
}));

function makeAuthedRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('Stripe Checkout API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to membership page for external return paths', async () => {
    const { stripe } = await import('@/lib/stripe');
    const res = await POST(makeAuthedRequest({
      interval: 'monthly',
      returnPath: 'https://evil.example/phish',
    }));

    expect(res.status).toBe(200);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/dashboard/settings/membership?checkout=success'),
      })
    );
  });
});
