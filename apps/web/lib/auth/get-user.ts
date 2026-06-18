import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export interface AuthUser {
  id: string;
  email?: string;
}

interface AuthResult {
  user: AuthUser | null;
  error: string | null;
  authMethod: 'cookie' | 'bearer' | null;
}

export interface AuthenticatedClientResult {
  supabase: SupabaseClient<Database>;
  user: AuthUser;
  authMethod: 'cookie' | 'bearer';
  error: null;
}

type AuthenticatedClientError = {
  supabase: null;
  user: null;
  authMethod: null;
  error: string;
};

export type AuthenticatedClientResponse = AuthenticatedClientResult | AuthenticatedClientError;

/**
 * Unified authentication helper for API routes.
 * Attempts Bearer token auth first (for mobile), then falls back to cookie session (for web).
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');

  // 1. Try Bearer token authentication (mobile clients)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Skip if token matches CRON_SECRET — that's not a user token
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && token === cronSecret) {
      return { user: null, error: 'Cron token is not a user token', authMethod: null };
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Create a one-off client to verify the access token
      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.error('[getAuthenticatedUser] Bearer token verification error:', error?.message, error);
        return { user: null, error: `Invalid Bearer token: ${error?.message || 'unknown error'}`, authMethod: null };
      }

      return {
        user: { id: user.id, email: user.email },
        error: null,
        authMethod: 'bearer',
      };
    } catch {
      return { user: null, error: 'Bearer token verification failed', authMethod: null };
    }
  }

  // 2. Fall back to cookie-based session (web browser)
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, error: 'Unauthorized', authMethod: null };
    }

    return {
      user: { id: user.id, email: user.email },
      error: null,
      authMethod: 'cookie',
    };
  } catch {
    return { user: null, error: 'Session verification failed', authMethod: null };
  }
}

/**
 * Returns a Supabase client scoped to the authenticated user.
 * Cookie sessions use the SSR client; mobile Bearer tokens use a one-off client.
 */
export async function createAuthenticatedSupabaseClient(
  request: NextRequest
): Promise<AuthenticatedClientResponse> {
  const { user, error, authMethod } = await getAuthenticatedUser(request);

  if (error || !user || !authMethod) {
    return {
      supabase: null,
      user: null,
      authMethod: null,
      error: error || 'Unauthorized',
    };
  }

  if (authMethod === 'bearer') {
    const token = request.headers.get('authorization')!.slice(7);
    const supabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );
    return { supabase, user, authMethod, error: null };
  }

  const supabase = await createClient();
  return { supabase, user, authMethod, error: null };
}
