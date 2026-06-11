import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ data: [], error: null }),
  }))
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
