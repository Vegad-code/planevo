import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}));

vi.mock('@/lib/auth/subscription', () => ({
  getUserPlan: vi.fn(),
  getUserPlanById: vi.fn().mockResolvedValue({ plan: 'free' }),
}));

import { checkRateLimitForUser } from '@/lib/auth/rateLimit';

describe('checkRateLimitForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fromMock
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            eq: () => ({
              gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: () => ({
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'usage-1' },
              error: null,
            }),
          }),
        }),
      });
  });

  it('returns the reserved usage row id for later completion logging', async () => {
    const result = await checkRateLimitForUser(
      'user-1',
      'bruno-chat',
      'user@example.com',
      'request-1'
    );

    expect(result).toMatchObject({
      allowed: true,
      usageLogId: 'usage-1',
    });
    expect(fromMock).toHaveBeenCalledTimes(2);
  });
});
