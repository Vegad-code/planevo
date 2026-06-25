import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  getUser,
  signInWithPassword,
  updateUser,
  signOut,
  sendPasswordChangedEmail,
  logSecurityAudit,
} = vi.hoisted(() => ({
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  logSecurityAudit: vi.fn(),
}));

vi.mock('@/lib/auth/get-user', () => ({
  createAuthenticatedSupabaseClient: vi.fn(async () => ({
    supabase: {
      auth: {
        getUser,
        updateUser,
        signOut,
      },
    },
    user: { id: 'user-1', email: 'user@example.com' },
    authMethod: 'cookie',
    error: null,
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword,
    },
  })),
}));

vi.mock('@/lib/email', () => ({
  sendPasswordChangedEmail,
}));

vi.mock('@/lib/security-audit', () => ({
  logSecurityAudit,
}));

vi.mock('@/lib/auth/ip-rate-limit', () => ({
  AUTH_IP_RATE_LIMITS: {
    changePassword: { bucket: 'auth:change-password', maxAttempts: 5, windowSeconds: 900 },
  },
  checkIpRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/auth/origin-guard', () => ({
  isAllowedOriginOrBearer: vi.fn(() => true),
}));

import { POST } from '../route';

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          identities: [{ provider: 'email' }],
          app_metadata: { provider: 'email' },
        },
      },
      error: null,
    });
    signInWithPassword.mockResolvedValue({ error: null });
    updateUser.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
    sendPasswordChangedEmail.mockResolvedValue('msg-1');
    logSecurityAudit.mockResolvedValue('audit-1');
  });

  it('rejects invalid payloads', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({ currentPassword: '', newPassword: 'short' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('rejects incorrect current password', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } });

    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({
          currentPassword: 'wrong-password',
          newPassword: 'newpassword1',
        }),
      })
    );

    expect(response.status).toBe(401);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('changes password for email users', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({
          currentPassword: 'oldpassword1',
          newPassword: 'newpassword1',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'oldpassword1',
    });
    expect(updateUser).toHaveBeenCalledWith({ password: 'newpassword1' });
    expect(sendPasswordChangedEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({ userAgent: null })
    );
    expect(logSecurityAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        action: 'auth.password_changed',
      })
    );
    expect(signOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('rejects google-only accounts', async () => {
    getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          identities: [{ provider: 'google' }],
          app_metadata: { provider: 'google' },
        },
      },
      error: null,
    });

    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({
          currentPassword: 'oldpassword1',
          newPassword: 'newpassword1',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
