import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/notifications/daily-sweep', () => ({
  runDailyNotificationSweep: vi.fn().mockResolvedValue({
    sent_morning_emails: 0,
    sent_deadline_emails: 0,
    sent_upcoming_emails: 0,
    sent_welcome_emails: 0,
    sent_push: 0,
    failed_push: 0,
    users_processed: 0,
  }),
}));

describe('welcome-series cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('rejects requests without CRON_SECRET authorization', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const req = new NextRequest('http://localhost:3000/api/cron/welcome-series');

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toMatch(/Unauthorized/i);
  });

  it('accepts requests with CRON_SECRET authorization', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const req = new NextRequest('http://localhost:3000/api/cron/welcome-series', {
      headers: { authorization: 'Bearer test-cron-secret' },
    });

    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});
