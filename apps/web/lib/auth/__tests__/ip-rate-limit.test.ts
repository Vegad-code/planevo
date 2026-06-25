import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/auth/ip-rate-limit';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkIpRateLimit } from '@/lib/auth/ip-rate-limit';

describe('ip-rate-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts client IP from x-forwarded-for', () => {
    const request = new NextRequest('http://localhost:3000/api/auth/sign-in', {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
    });
    expect(getClientIp(request)).toBe('203.0.113.1');
  });

  it('allows request when RPC returns true', async () => {
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
      data: true,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
      success: true,
    } as never);
    const request = new NextRequest('http://localhost:3000/api/auth/sign-in');
    const result = await checkIpRateLimit(request, {
      bucket: 'auth:sign-in',
      maxAttempts: 10,
      windowSeconds: 900,
    });
    expect(result.allowed).toBe(true);
  });

  it('denies request when RPC returns false', async () => {
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
      data: false,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
      success: true,
    } as never);
    const request = new NextRequest('http://localhost:3000/api/auth/sign-in');
    const result = await checkIpRateLimit(request, {
      bucket: 'auth:sign-in',
      maxAttempts: 10,
      windowSeconds: 900,
    });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(900);
  });

  it('fails closed when RPC errors', async () => {
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
      data: null,
      error: {
        message: 'db down',
        details: '',
        hint: '',
        code: '500',
        name: 'PostgrestError',
      },
      count: null,
      status: 500,
      statusText: 'Error',
      success: false,
    } as never);
    const request = new NextRequest('http://localhost:3000/api/auth/sign-in');
    const result = await checkIpRateLimit(request, {
      bucket: 'auth:sign-in',
      maxAttempts: 10,
      windowSeconds: 900,
    });
    expect(result.allowed).toBe(false);
  });
});
