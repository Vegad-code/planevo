import { describe, expect, it } from 'vitest';
import {
  formatResetCountdown,
  parseBrunoRateLimitError,
} from '@/lib/bruno/rate-limit-client';

describe('parseBrunoRateLimitError', () => {
  it('parses structured JSON from Error.message', () => {
    const payload = {
      error: 'rate_limit_reached',
      limitType: 'daily',
      message: 'Daily limit reached',
      used: 5,
      limit: 5,
      plan: 'free',
      resetAt: '2026-06-25T12:00:00.000Z',
    };

    const parsed = parseBrunoRateLimitError(new Error(JSON.stringify(payload)));
    expect(parsed).toEqual(payload);
  });

  it('returns null for unrelated errors', () => {
    expect(parseBrunoRateLimitError(new Error('Network error'))).toBeNull();
    expect(parseBrunoRateLimitError(null)).toBeNull();
  });
});

describe('formatResetCountdown', () => {
  const now = new Date('2026-06-24T12:00:00.000Z').getTime();

  it('formats minutes under one hour', () => {
    expect(
      formatResetCountdown('2026-06-24T12:30:00.000Z', now)
    ).toBe('30 minutes');
  });

  it('formats hours and minutes', () => {
    expect(
      formatResetCountdown('2026-06-24T14:15:00.000Z', now)
    ).toBe('2h 15m');
  });

  it('returns immediate copy when reset has passed', () => {
    expect(
      formatResetCountdown('2026-06-24T11:00:00.000Z', now)
    ).toBe('any moment now');
  });
});
