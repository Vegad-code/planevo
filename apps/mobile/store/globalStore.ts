import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  plan_type?: string;
  energy_preference?: 'low' | 'medium' | 'high';
  push_notifications_enabled?: boolean;
  canvasConnected?: boolean;
  googleConnected?: boolean;
}

interface NotificationPreferences {
  master_toggle: boolean;
  channels: { push: boolean; email: boolean };
}

interface GlobalState {
  profile: UserProfile | null;
  notificationPrefs: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchProfile: (userId: string) => Promise<void>;
  updateEnergyPreference: (preference: 'low' | 'medium' | 'high') => Promise<void>;
  toggleNotifications: (enabled: boolean) => Promise<void>;
  clearStore: () => void;
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  profile: null,
  notificationPrefs: null,
  loading: false,
  error: null,

  fetchProfile: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const [profileResult, integrationsResult] = await Promise.all([
        supabase
          .from('users')
          .select('*, notification_preferences(*)')
          .eq('id', userId)
          .single(),
        supabase
          .from('integration_accounts_public' as 'integration_accounts')
          .select('provider, status')
          .eq('user_id', userId),
      ]);

      if (profileResult.error) throw profileResult.error;

      const accounts = integrationsResult.data ?? [];
      const canvasConnected = accounts.some(
        (a) => a.provider === 'canvas' && a.status === 'connected'
      );
      const googleConnected = accounts.some(
        (a) => a.provider === 'google_calendar' && a.status === 'connected'
      );

      const rawPrefs = profileResult.data.notification_preferences;
      const notificationPrefs = Array.isArray(rawPrefs) ? rawPrefs[0] : rawPrefs;

      set({
        profile: {
          id: profileResult.data.id,
          name: profileResult.data.name ?? undefined,
          email: profileResult.data.email ?? undefined,
          plan_type: profileResult.data.plan_type ?? undefined,
          energy_preference: (profileResult.data.energy_preference as UserProfile['energy_preference']) ?? undefined,
          push_notifications_enabled: profileResult.data.push_notifications_enabled ?? undefined,
          canvasConnected,
          googleConnected,
        },
        notificationPrefs: (notificationPrefs as unknown as NotificationPreferences | null) || null,
        loading: false,
      });
    } catch (err: unknown) {
      console.error('Error fetching global profile:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to load profile',
        loading: false,
      });
    }
  },

  updateEnergyPreference: async (preference: 'low' | 'medium' | 'high') => {
    const { profile } = get();
    if (!profile) return;

    // Optimistic UI update
    set({ profile: { ...profile, energy_preference: preference } });

    try {
      const { error } = await supabase
        .from('users')
        .update({ energy_preference: preference })
        .eq('id', profile.id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating energy preference:', err);
      // Revert on failure
      get().fetchProfile(profile.id);
    }
  },

  toggleNotifications: async (enabled: boolean) => {
    const { profile, notificationPrefs } = get();
    if (!profile) return;

    // Optimistic UI
    const updatedPrefs = notificationPrefs 
      ? { ...notificationPrefs, master_toggle: enabled, channels: { ...notificationPrefs.channels, push: enabled } }
      : { master_toggle: enabled, channels: { push: enabled, email: true } };

    set({ notificationPrefs: updatedPrefs as NotificationPreferences });

    try {
      // Logic from settings.tsx
      if (notificationPrefs) {
        await supabase
          .from('notification_preferences')
          .update({
             master_toggle: enabled,
             channels: { ...notificationPrefs.channels, push: enabled },
             updated_at: new Date().toISOString()
          })
          .eq('user_id', profile.id);
      } else {
        await supabase
          .from('notification_preferences')
          .insert({
            user_id: profile.id,
            master_toggle: enabled,
            channels: { push: enabled, email: true },
            quiet_hours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
            types: { daily_plan: true, deadline_rescue: true, weekly_review: true, account: true, billing: true, system: true }
          });
      }
    } catch (err) {
      console.error('Failed to toggle notifications:', err);
      get().fetchProfile(profile.id); // Revert on error
    }
  },

  clearStore: () => {
    set({ profile: null, notificationPrefs: null, error: null, loading: false });
  }
}));
