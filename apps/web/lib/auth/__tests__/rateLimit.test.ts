import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock, fromMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    rpc: rpcMock,
    from: fromMock,
  },
}));

vi.mock('@/lib/auth/subscription', () => ({
  getUserPlan: vi.fn(),
  getUserPlanById: vi.fn().mockResolvedValue({ plan: 'free' }),
}));

import { checkRateLimitForUser } from '@/lib/auth/rateLimit';

function mockAiUsageLogsTable(options: {
  count?: number;
  existingRequestId?: string | null;
  insertedId?: string;
  oldestCreatedAt?: string | null;
}) {
  const count = options.count ?? 0;
  const existingRequestId = options.existingRequestId ?? null;
  const insertedId = options.insertedId ?? 'fallback-1';
  const oldestCreatedAt = options.oldestCreatedAt ?? '2026-06-23T12:00:00.000Z';

  fromMock.mockImplementation((table: string) => {
    if (table !== 'ai_usage_logs') throw new Error(`unexpected table ${table}`);
    const chain = {
      eq: vi.fn(),
      gte: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    };

    chain.eq.mockImplementation((column: string) => {
      if (column === 'request_id') {
        return {
          maybeSingle: vi.fn().mockResolvedValue(
            existingRequestId ? { data: { id: existingRequestId } } : { data: null }
          ),
        };
      }
      return chain;
    });
    chain.gte.mockReturnValue(chain);
    chain.order.mockReturnValue(chain);
    chain.limit.mockResolvedValue({
      data: oldestCreatedAt ? [{ created_at: oldestCreatedAt }] : [],
      error: null,
    });

    const headCountResult = { count, error: null };

    return {
      select: vi.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.head) {
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue(headCountResult),
              }),
            }),
          };
        }
        return chain;
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: insertedId }, error: null }),
        }),
      }),
    };
  });
}

describe('checkRateLimitForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({
      data: [{ allowed: true, usage_log_id: 'usage-1' }],
      error: null,
    });
    mockAiUsageLogsTable({});
  });

  it('returns denied when RPC reports quota exceeded', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: false, usage_log_id: null }],
      error: null,
    });
    mockAiUsageLogsTable({
      count: 5,
      oldestCreatedAt: '2026-06-23T12:00:00.000Z',
    });

    const result = await checkRateLimitForUser('user-1', 'bruno-chat');

    expect(result.allowed).toBe(false);
    if (!result.allowed && result.resetAt) {
      expect(result).toMatchObject({
        error: 'rate_limit_reached',
        limitType: 'daily',
        used: 5,
        limit: 5,
        plan: 'free',
      });
      expect(result.resetAt).toBe('2026-06-24T12:00:00.000Z');
    }
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
    expect(rpcMock).toHaveBeenCalledWith('consume_ai_usage_admin', {
      p_user_id: 'user-1',
      p_feature: 'bruno-chat',
      p_daily_limit: 5,
      p_request_id: 'request-1',
    });
  });

  it('falls back when consume_ai_usage_admin RPC is missing', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'function not found' },
    });
    mockAiUsageLogsTable({ insertedId: 'fallback-1' });

    const result = await checkRateLimitForUser(
      'user-1',
      'bruno-chat',
      'user@example.com',
      'req-1'
    );

    expect(result).toMatchObject({ allowed: true, usageLogId: 'fallback-1' });
  });
});
