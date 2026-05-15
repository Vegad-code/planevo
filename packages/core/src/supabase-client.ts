import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Platform-agnostic Supabase client factory.
 * Pass in a custom storage adapter (e.g. expo-secure-store) for native,
 * or omit for default browser storage.
 */
export function createSupabaseMobileClient(
  url: string,
  anonKey: string,
  storage?: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  }
) {
  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      ...(storage ? { storage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
