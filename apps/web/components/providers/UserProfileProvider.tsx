'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearLegacyAppearanceStorage } from '@/lib/appearance/appearance-storage';
import { isPaidPlan, normalizePlanType, type PlanType } from '@/lib/auth/plan-types';
import type { AuthenticatedProfile, UserProfileRow } from '@/lib/auth/get-authenticated-profile';

interface UserProfileContextValue {
  userId: string;
  email?: string;
  profile: UserProfileRow;
  planType: PlanType;
  isPremium: boolean;
  avatarUrl: string | null;
  userName: string;
  refreshProfile: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({
  initial,
  children,
}: {
  initial: AuthenticatedProfile;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState(initial.profile);
  const [userMeta, setUserMeta] = useState(initial.user);

  const planType = normalizePlanType(profile.plan_type);
  const isPremium = isPaidPlan(planType, planType === 'admin');
  const avatarUrl =
    profile.avatar_url ?? userMeta.metadataAvatar ?? null;
  const userName = profile.name || 'User';

  const refreshProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: next } = await supabase
      .from('users')
      .select(
        'id, name, plan_type, avatar_url, subscription_status, trial_end, theme, accent_color, font_size, reduce_motion, sidebar_style, google_calendar_connected'
      )
      .eq('id', user.id)
      .single();

    if (next) {
      setProfile(next);
      const metadata = user.user_metadata as Record<string, string | undefined> | undefined;
      setUserMeta({
        id: user.id,
        email: user.email,
        metadataAvatar: metadata?.avatar_url ?? metadata?.picture ?? null,
      });
    }
  }, []);

  const handleLogout = useCallback(async () => {
    clearLegacyAppearanceStorage();
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  const value = useMemo<UserProfileContextValue>(
    () => ({
      userId: userMeta.id,
      email: userMeta.email,
      profile,
      planType,
      isPremium,
      avatarUrl,
      userName,
      refreshProfile,
      handleLogout,
    }),
    [userMeta, profile, planType, isPremium, avatarUrl, userName, refreshProfile, handleLogout]
  );

  return (
    <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return ctx;
}

/** Safe hook for components that may render outside dashboard shell. */
export function useUserProfileOptional(): UserProfileContextValue | null {
  return useContext(UserProfileContext);
}
