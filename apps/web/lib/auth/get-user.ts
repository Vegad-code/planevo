import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
  authMethod: 'cookie' | 'bearer' | null;
}

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
        return { user: null, error: 'Invalid or expired Bearer token', authMethod: null };
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
