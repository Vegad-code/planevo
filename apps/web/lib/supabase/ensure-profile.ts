import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensures that a row exists in public.users for the current auth user.
 * The tasks, goals, habits, and schedules tables all have a foreign key
 * referencing public.users(id), so inserts will silently fail if the
 * profile row is missing (e.g. when the on_auth_user_created trigger
 * was never applied to the database).
 */
export async function ensureUserProfile(supabase: SupabaseClient) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { user: null, error: authError || new Error('Not authenticated') };
  }

  // Check if the profile already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existing) {
    // Create the profile row
    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    });

    if (insertError) {
      console.error('Failed to create user profile:', insertError);
      // Don't block — it may already exist due to a race condition
    }
  }

  return { user, error: null };
}
