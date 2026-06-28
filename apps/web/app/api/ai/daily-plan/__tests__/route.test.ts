import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { generateDailyPlan } from '@/lib/ai/generate-daily-plan';

vi.mock('@/lib/ai/generate-daily-plan', () => ({
  generateDailyPlan: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { plan_type: 'free' } }),
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/auth/origin-guard', () => ({
  isAllowedOriginOrBearer: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/auth/get-user', () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    user: { id: 'test-user', email: 'test@example.com' },
    error: null,
    authMethod: 'cookie',
  }),
}));

vi.mock('@/lib/auth/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkRateLimitForUser: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe('Daily Plan API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateDailyPlan).mockResolvedValue({
      ok: true,
      plan: [
        {
          id: 'task-1',
          title: 'Test task',
          suggested_start: new Date(Date.now() + 3_600_000).toISOString(),
          suggested_end: new Date(Date.now() + 7_200_000).toISOString(),
        },
      ],
      overflow: 0,
      summary: 'Test summary',
      message: 'Here is your plan',
      energyLevel: 'medium',
    });
  });

  it('generates a daily plan successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/daily-plan', {
      method: 'POST',
      body: JSON.stringify({ energyLevel: 'medium' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.schedule).toBeDefined();
    expect(data.schedule.length).toBe(1);
    expect(data.schedule[0].title).toBe('Test task');
    expect(generateDailyPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'test-user',
        energyLevel: 'medium',
        trigger: 'manual',
      })
    );
  });

  it('handles generation failures gracefully', async () => {
    vi.mocked(generateDailyPlan).mockRejectedValueOnce(new Error('AI API failure'));

    const req = new NextRequest('http://localhost:3000/api/ai/daily-plan', {
      method: 'POST',
      body: JSON.stringify({ energyLevel: 'medium' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('AI API failure');
  });
});
