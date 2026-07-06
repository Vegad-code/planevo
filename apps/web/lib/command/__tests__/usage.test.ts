import { describe, it, expect, vi, beforeEach } from 'vitest';

const checkRateLimitForUserMock = vi.fn();
vi.mock('@/lib/auth/rateLimit', () => ({
  checkRateLimitForUser: (...args: unknown[]) => checkRateLimitForUserMock(...args),
}));

import {
  reserveCommandAiRequest,
  limitPolicyForPlan,
  COMMAND_LIMITS,
} from '../usage';
import { COMMAND_USAGE_FEATURES } from '../models';

beforeEach(() => checkRateLimitForUserMock.mockReset());

describe('limitPolicyForPlan', () => {
  it('maps plans to the right policy', () => {
    expect(limitPolicyForPlan('free')).toBe(COMMAND_LIMITS.free);
    expect(limitPolicyForPlan('canceled')).toBe(COMMAND_LIMITS.free);
    expect(limitPolicyForPlan('student')).toBe(COMMAND_LIMITS.student);
    expect(limitPolicyForPlan('premium')).toBe(COMMAND_LIMITS.premium);
    expect(limitPolicyForPlan('trialing')).toBe(COMMAND_LIMITS.premium);
    expect(limitPolicyForPlan('admin')).toBe(COMMAND_LIMITS.premium);
  });

  it('keeps free deep-Bruno locked and unlimited premium sources', () => {
    expect(COMMAND_LIMITS.free.deepBrunoPerMonth).toBe(0);
    expect(COMMAND_LIMITS.premium.connectedSources).toBe('unlimited');
  });
});

describe('reserveCommandAiRequest', () => {
  it('allows when the shared limiter allows', async () => {
    checkRateLimitForUserMock.mockResolvedValueOnce({
      allowed: true,
      plan: 'student',
      usageLogId: 'log-1',
    });
    const decision = await reserveCommandAiRequest(
      'user-1',
      COMMAND_USAGE_FEATURES.textExtract,
      'a@b.com',
    );
    expect(decision.allowed).toBe(true);
    if (decision.allowed) expect(decision.plan).toBe('student');
  });

  it('rejects (with reset info) when the limiter denies', async () => {
    checkRateLimitForUserMock.mockResolvedValueOnce({
      allowed: false,
      plan: 'free',
      limitType: 'daily',
      message: 'out of cleanups',
      resetAt: '2026-07-05T00:00:00.000Z',
      used: 5,
      limit: 5,
    });
    const decision = await reserveCommandAiRequest(
      'user-1',
      COMMAND_USAGE_FEATURES.textExtract,
    );
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toBe('daily');
      expect(decision.resetAt).toBe('2026-07-05T00:00:00.000Z');
      expect(decision.remainingToday).toBe(0);
    }
  });

  it('passes the Command feature key to the shared limiter', async () => {
    checkRateLimitForUserMock.mockResolvedValueOnce({ allowed: true, plan: 'premium' });
    await reserveCommandAiRequest('u', COMMAND_USAGE_FEATURES.textExtract, 'e@x.com', 'req-9');
    expect(checkRateLimitForUserMock).toHaveBeenCalledWith(
      'u',
      'command_text_extract',
      'e@x.com',
      'req-9',
    );
  });
});
