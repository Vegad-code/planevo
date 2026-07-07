import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60;

const signInWithPassword = vi.fn();
let capturedSetAll:
  | ((cookies: { name: string; value: string; options?: { maxAge?: number; path?: string } }[]) => void)
  | undefined;

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url, _key, config) => {
    capturedSetAll = config.cookies.setAll;
    return {
      auth: { signInWithPassword },
    };
  }),
}));

vi.mock('@/lib/auth/ip-rate-limit', () => ({
  AUTH_IP_RATE_LIMITS: { signIn: { bucket: 'auth:sign-in', maxAttempts: 10, windowSeconds: 900 } },
  checkIpRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/auth/origin-guard', () => ({
  isAllowedOrigin: vi.fn(() => true),
}));

import { POST } from '../route';
import { checkIpRateLimit } from '@/lib/auth/ip-rate-limit';

describe('POST /api/auth/sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSetAll = undefined;
    signInWithPassword.mockImplementation(async () => {
      capturedSetAll?.([
        {
          name: 'sb-auth-token',
          value: 'token',
          options: { maxAge: 3600, path: '/' },
        },
      ]);
      return { error: null };
    });
  });

  it('rejects invalid payloads', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({ email: 'not-an-email', password: '' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('returns 429 when IP rate limit is exceeded', async () => {
    vi.mocked(checkIpRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 900 });
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({ email: 'user@example.com', password: 'secret' }),
      })
    );
    expect(response.status).toBe(429);
  });

  it('signs in with valid credentials', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({ email: 'user@example.com', password: 'secret' }),
      })
    );
    expect(response.status).toBe(200);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret',
    });
    expect(response.cookies.get('sb-auth-token')?.value).toBe('token');
  });

  it('uses a 30-day cookie lifetime when remember me is enabled', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'secret',
          rememberMe: true,
        }),
      })
    );

    expect(response.status).toBe(200);
    const cookie = response.cookies.get('sb-auth-token');
    expect(cookie?.value).toBe('token');
    expect(cookie).toMatchObject({ maxAge: REMEMBER_MAX_AGE });
  });

  it('uses session cookies when remember me is disabled', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://planevo.co' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'secret',
          rememberMe: false,
        }),
      })
    );

    expect(response.status).toBe(200);
    const cookie = response.cookies.get('sb-auth-token');
    expect(cookie?.value).toBe('token');
    expect(cookie?.maxAge).toBeUndefined();
  });
});
