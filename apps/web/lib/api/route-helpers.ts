import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import {
  getAuthenticatedUser,
  createAuthenticatedSupabaseClient,
  type AuthUser,
  type AuthenticatedClientResult,
} from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { isCronAuthorized } from '@/lib/notifications/cron-auth';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T extends Record<string, unknown>>(data: T): NextResponse {
  return NextResponse.json(data);
}

// ---------------------------------------------------------------------------
// Route context for dynamic segments
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteContext = { params: Promise<any> };

// ---------------------------------------------------------------------------
// Authenticated route wrapper (returns AuthUser only, no Supabase client)
// ---------------------------------------------------------------------------

type AuthHandlerContext = {
  user: AuthUser;
  request: NextRequest;
  params: RouteContext['params'];
};

type AuthHandler = (ctx: AuthHandlerContext) => Promise<NextResponse>;

/**
 * Wraps an API route handler with origin guard + user authentication.
 * Eliminates the repeated isAllowedOriginOrBearer + getAuthenticatedUser boilerplate.
 */
export function withAuth(handler: AuthHandler) {
  return async (request: NextRequest, context?: RouteContext): Promise<NextResponse> => {
    if (!isAllowedOriginOrBearer(request)) {
      return apiError('Invalid request origin', 403);
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return apiError(authError || 'Unauthorized', 401);
    }

    return handler({ user, request, params: context?.params ?? Promise.resolve({}) });
  };
}

// ---------------------------------------------------------------------------
// Authenticated route wrapper (returns Supabase client scoped to user)
// ---------------------------------------------------------------------------

type AuthClientHandlerContext = {
  user: AuthUser;
  supabase: AuthenticatedClientResult['supabase'];
  request: NextRequest;
  params: RouteContext['params'];
};

type AuthClientHandler = (ctx: AuthClientHandlerContext) => Promise<NextResponse>;

/**
 * Wraps an API route handler with origin guard + authenticated Supabase client.
 * Use when you need an RLS-scoped Supabase client for the authenticated user.
 */
export function withAuthClient(handler: AuthClientHandler) {
  return async (request: NextRequest, context?: RouteContext): Promise<NextResponse> => {
    if (!isAllowedOriginOrBearer(request)) {
      return apiError('Invalid request origin', 403);
    }

    const auth = await createAuthenticatedSupabaseClient(request);
    if (auth.error || !auth.user) {
      return apiError('Unauthorized', 401);
    }

    return handler({ user: auth.user, supabase: auth.supabase, request, params: context?.params ?? Promise.resolve({}) });
  };
}

// ---------------------------------------------------------------------------
// Cron route wrapper
// ---------------------------------------------------------------------------

type CronHandlerContext = {
  supabase: SupabaseClient<Database>;
  request: NextRequest;
};

type CronHandler = (ctx: CronHandlerContext) => Promise<NextResponse>;

/**
 * Wraps a cron route handler with CRON_SECRET auth + admin Supabase client creation.
 * Eliminates the repeated isCronAuthorized + env check + createClient boilerplate.
 */
export function withCron(handler: CronHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    if (!isCronAuthorized(request)) {
      return apiError('Unauthorized', 401);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return apiError('Supabase admin credentials are not configured', 500);
    }

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    return handler({ supabase, request });
  };
}
