import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Supabase admin client — bypasses RLS.
 * Use ONLY in server-side API routes (webhooks, crons).
 * Never expose to the client.
 * 
 * Lazy-initialized to avoid throwing at module-load during builds
 * when env vars may not be present.
 */
let _adminClient: SupabaseClient<Database> | null = null;

function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    _adminClient = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
}

/**
 * Lazy proxy that defers Supabase admin client creation until first use.
 * This lets `supabaseAdmin.from(...)` work normally with full type safety,
 * while avoiding module-load errors during builds without env vars.
 */
export const supabaseAdmin: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_target, prop, receiver) {
      const client = getSupabaseAdmin();
      const value = Reflect.get(client, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    },
  }
);
