/**
 * Planevo Command — DB client accessor.
 *
 * The generated `Database` type does not yet include the Command tables (they land
 * with migration `20260704150000_planevo_command.sql`; regenerating the global
 * type is a Phase 12 chore). Until then, Command persistence uses a permissive
 * client so `.from('responsibility_items')` etc. type-check. This is the single
 * place that cast lives — do not scatter `as unknown as` across the codebase.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Untyped Supabase client scoped to Command tables. */
export type CommandDbClient = SupabaseClient;

export function commandDb(): CommandDbClient {
  return supabaseAdmin as unknown as CommandDbClient;
}
