import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => {
    const emptyResult = { data: [] as unknown[], error: null };

    const makeQuery = () => {
      const query = {
        select: vi.fn(),
        range: vi.fn(),
        order: vi.fn(),
        in: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
        not: vi.fn(),
        is: vi.fn(),
        then(
          onFulfilled: (value: typeof emptyResult) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) {
          return Promise.resolve(emptyResult).then(onFulfilled, onRejected);
        },
      };
      query.select.mockReturnValue(query);
      query.range.mockReturnValue(query);
      query.order.mockReturnValue(query);
      query.in.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.gte.mockReturnValue(query);
      query.not.mockReturnValue(query);
      query.is.mockReturnValue(query);
      return query;
    };

    return {
      from: vi.fn(() => makeQuery()),
    };
  }),
}));

vi.mock('@/lib/email', () => ({
  buildEmailIdempotencyKey: vi.fn(),
  sendWeeklyReviewEmail: vi.fn(),
}));

describe('weekly-review cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  it('rejects requests without CRON_SECRET authorization', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const req = new NextRequest('http://localhost:3000/api/cron/weekly-review');

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toMatch(/Unauthorized/i);
  });

  it('accepts requests with CRON_SECRET authorization', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const req = new NextRequest('http://localhost:3000/api/cron/weekly-review', {
      headers: { authorization: 'Bearer test-cron-secret' },
    });

    const res = await GET(req);

    expect([200, 204]).toContain(res.status);
  });
});
