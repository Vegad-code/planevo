import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/origin-guard', () => ({
  isAllowedOriginOrBearer: vi.fn(),
}));

vi.mock('@/lib/auth/get-user', () => ({
  getAuthenticatedUser: vi.fn(),
  createAuthenticatedSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/notifications/cron-auth', () => ({
  isCronAuthorized: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ __client: 'admin' })),
}));

import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import {
  getAuthenticatedUser,
  createAuthenticatedSupabaseClient,
} from '@/lib/auth/get-user';
import { isCronAuthorized } from '@/lib/notifications/cron-auth';
import { createClient } from '@supabase/supabase-js';
import {
  apiError,
  apiSuccess,
  withAuth,
  withAuthClient,
  withCron,
} from '@/lib/api/route-helpers';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/test');
}

const OK = { id: 'user-1', email: 'a@b.com' } as const;

describe('apiError / apiSuccess', () => {
  it('apiError returns the message and status', async () => {
    const res = apiError('nope', 418);
    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({ error: 'nope' });
  });

  it('apiSuccess returns the payload with status 200', async () => {
    const res = apiSuccess({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: 'world' });
  });
});

describe('withAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when origin is not allowed', async () => {
    vi.mocked(isAllowedOriginOrBearer).mockReturnValue(false);
    const handler = vi.fn();
    const res = await withAuth(handler)(makeRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Invalid request origin' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 with the auth error message when authentication fails', async () => {
    vi.mocked(isAllowedOriginOrBearer).mockReturnValue(true);
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: null,
      error: 'Invalid Bearer token: expired',
      authMethod: null,
    });
    const handler = vi.fn();
    const res = await withAuth(handler)(makeRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid Bearer token: expired' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('falls back to generic Unauthorized when no error message is provided', async () => {
    vi.mocked(isAllowedOriginOrBearer).mockReturnValue(true);
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: null,
      error: null,
      authMethod: null,
    });
    const res = await withAuth(vi.fn())(makeRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('invokes the handler with the user and resolved params on success', async () => {
    vi.mocked(isAllowedOriginOrBearer).mockReturnValue(true);
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: OK,
      error: null,
      authMethod: 'cookie',
    });
    const handler = vi.fn().mockResolvedValue(apiSuccess({ ok: true }));
    const request = makeRequest();
    const res = await withAuth(handler)(request, { params: Promise.resolve({ id: '42' }) });

    expect(handler).toHaveBeenCalledTimes(1);
    const ctx = handler.mock.calls[0][0];
    expect(ctx.user).toEqual(OK);
    expect(ctx.request).toBe(request);
    await expect(ctx.params).resolves.toEqual({ id: '42' });
    expect(res.status).toBe(200);
  });

  it('defaults params to an empty object when no context is passed', async () => {
    vi.mocked(isAllowedOriginOrBearer).mockReturnValue(true);
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: OK,
      error: null,
      authMethod: 'cookie',
    });
    const handler = vi.fn().mockResolvedValue(apiSuccess({ ok: true }));
    await withAuth(handler)(makeRequest());
    await expect(handler.mock.calls[0][0].params).resolves.toEqual({});
  });
});

describe('withAuthClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when origin is not allowed', async () => {
    vi.mocked(isAllowedOriginOrBearer).mockReturnValue(false);
    const handler = vi.fn();
    const res = await withAuthClient(handler)(makeRequest());
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 401 when the authenticated client cannot be created', async () => {
    vi.mocked(isAllowedOriginOrBearer).mockReturnValue(true);
    vi.mocked(createAuthenticatedSupabaseClient).mockResolvedValue({
      supabase: null,
      user: null,
      authMethod: null,
      error: 'Unauthorized',
    });
    const handler = vi.fn();
    const res = await withAuthClient(handler)(makeRequest());
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('invokes the handler with the scoped supabase client on success', async () => {
    const fakeSupabase = { from: vi.fn() };
    vi.mocked(isAllowedOriginOrBearer).mockReturnValue(true);
    vi.mocked(createAuthenticatedSupabaseClient).mockResolvedValue({
      supabase: fakeSupabase as never,
      user: OK,
      authMethod: 'cookie',
      error: null,
    });
    const handler = vi.fn().mockResolvedValue(apiSuccess({ ok: true }));
    const res = await withAuthClient(handler)(makeRequest());

    expect(handler).toHaveBeenCalledTimes(1);
    const ctx = handler.mock.calls[0][0];
    expect(ctx.user).toEqual(OK);
    expect(ctx.supabase).toBe(fakeSupabase);
    expect(res.status).toBe(200);
  });
});

describe('withCron', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns 401 when the cron request is not authorized', async () => {
    vi.mocked(isCronAuthorized).mockReturnValue(false);
    const handler = vi.fn();
    const res = await withCron(handler)(makeRequest());
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('returns 500 when admin credentials are missing', async () => {
    vi.mocked(isCronAuthorized).mockReturnValue(true);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const handler = vi.fn();
    const res = await withCron(handler)(makeRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'Supabase admin credentials are not configured',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('invokes the handler with an admin supabase client on success', async () => {
    vi.mocked(isCronAuthorized).mockReturnValue(true);
    const handler = vi.fn().mockResolvedValue(apiSuccess({ ran: true }));
    const res = await withCron(handler)(makeRequest());

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].supabase).toEqual({ __client: 'admin' });
    expect(res.status).toBe(200);
  });
});
