import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  generateLink,
  sendPasswordResetEmail,
  logSecurityAudit,
  hasNotificationDelivery,
  recordNotificationDelivery,
} = vi.hoisted(() => ({
  generateLink: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  logSecurityAudit: vi.fn(),
  hasNotificationDelivery: vi.fn(),
  recordNotificationDelivery: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        generateLink,
      },
    },
  },
}));

vi.mock('@/lib/email', () => ({
  buildEmailIdempotencyKey: vi.fn(() => 'idempotency-key'),
  sendPasswordResetEmail,
}));

vi.mock('@/lib/notifications/delivery', () => ({
  hasNotificationDelivery,
  recordNotificationDelivery,
}));

vi.mock('@/lib/auth/ip-rate-limit', () => ({
  AUTH_IP_RATE_LIMITS: {
    passwordReset: { bucket: 'auth:password-reset', maxAttempts: 5, windowSeconds: 900 },
  },
  checkIpRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/auth/origin-guard', () => ({
  isAllowedOriginOrMobileClient: vi.fn(() => true),
}));

vi.mock('@/lib/security-audit', () => ({
  logSecurityAudit,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { POST } from '../route';
import { checkIpRateLimit } from '@/lib/auth/ip-rate-limit';
import { isAllowedOriginOrMobileClient } from '@/lib/auth/origin-guard';

describe('POST /api/auth/password-reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasNotificationDelivery.mockResolvedValue(false);
    generateLink.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'user@example.com' },
        properties: {
          hashed_token: 'recovery-token-hash',
          action_link: 'https://example.com/reset',
        },
      },
      error: null,
    });
    sendPasswordResetEmail.mockResolvedValue('msg-1');
    recordNotificationDelivery.mockResolvedValue(undefined);
    logSecurityAudit.mockResolvedValue('audit-1');
  });

  it('rejects invalid payloads', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({ email: 'not-an-email' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('returns uniform success when auth user is missing', async () => {
    generateLink.mockResolvedValueOnce({ data: null, error: { message: 'User not found' } });

    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({ email: 'missing@example.com' }),
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('sends reset email and logs audit for existing auth users', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://planevo.co',
        },
        body: JSON.stringify({ email: 'user@example.com' }),
      })
    );

    expect(response.status).toBe(200);
    expect(generateLink).toHaveBeenCalled();
    expect(sendPasswordResetEmail).toHaveBeenCalled();
    expect(logSecurityAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        action: 'auth.password_reset',
      })
    );
  });

  it('returns 429 when IP rate limit is exceeded', async () => {
    vi.mocked(checkIpRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 900 });
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({ email: 'user@example.com' }),
      })
    );
    expect(response.status).toBe(429);
  });

  it('allows mobile client header without origin', async () => {
    vi.mocked(isAllowedOriginOrMobileClient).mockReturnValueOnce(true);
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-planevo-client': 'mobile',
        },
        body: JSON.stringify({ email: 'user@example.com' }),
      })
    );
    expect(response.status).toBe(200);
  });
});
