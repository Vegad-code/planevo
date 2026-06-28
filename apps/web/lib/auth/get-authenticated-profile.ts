import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database';

export type UserProfileRow = Pick<
  Tables<'users'>,
  | 'id'
  | 'name'
  | 'plan_type'
  | 'avatar_url'
  | 'subscription_status'
  | 'trial_end'
  | 'theme'
  | 'accent_color'
  | 'font_size'
  | 'reduce_motion'
  | 'sidebar_style'
  | 'google_calendar_connected'
>;

export interface AuthenticatedProfile {
  user: {
    id: string;
    email?: string;
    metadataAvatar: string | null;
  };
  profile: UserProfileRow;
}

/**
 * Deduplicated per-request loader for auth + users row.
 * Use in dashboard layout and server pages instead of separate getUser + users queries.
 */
export const getAuthenticatedProfile = cache(async (): Promise<AuthenticatedProfile> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(
      'id, name, plan_type, avatar_url, subscription_status, trial_end, theme, accent_color, font_size, reduce_motion, sidebar_style, google_calendar_connected'
    )
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  const metadata = user.user_metadata as Record<string, string | undefined> | undefined;

  return {
    user: {
      id: user.id,
      email: user.email,
      metadataAvatar: metadata?.avatar_url ?? metadata?.picture ?? null,
    },
    profile,
  };
});
