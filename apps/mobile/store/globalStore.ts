import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  disablePushNotifications,
  getNotificationPermissionState,
  syncPushNotificationState,
  type NotificationPermissionState,
} from '@/lib/notifications';

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

export interface NotificationTypePrefs {
  daily_plan: boolean;
  deadline_rescue: boolean;
  upcoming_reminders: boolean;
  canvas_assignments: boolean;
  calendar_events: boolean;
  work_slack: boolean;
  work_linear: boolean;
  work_notion: boolean;
  weekly_review: boolean;
  account: boolean;
  billing: boolean;
  system: boolean;
}

export interface NotificationPreferences {
  master_toggle: boolean;
  channels: { push: boolean; email: boolean };
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  types: NotificationTypePrefs;
}

const DEFAULT_TYPES: NotificationTypePrefs = {
  daily_plan: true,
  deadline_rescue: true,
  upcoming_reminders: true,
  canvas_assignments: false,
  calendar_events: true,
  work_slack: false,
  work_linear: false,
  work_notion: false,
  weekly_review: true,
  account: true,
  billing: true,
  system: true,
};

function normalizePrefs(
  raw: Record<string, unknown> | Record<string, unknown>[] | null | undefined
): NotificationPreferences | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row) return null;

  const channels = (row.channels as NotificationPreferences['channels']) ?? { push: true, email: true };
  const quietHours = (row.quiet_hours as NotificationPreferences['quiet_hours']) ?? {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
  const types = { ...DEFAULT_TYPES, ...((row.types as Partial<NotificationTypePrefs>) ?? {}) };

  return {
    master_toggle: row.master_toggle !== false,
    channels: { push: channels.push !== false, email: channels.email !== false },
    quiet_hours: quietHours,
    types,
  };
}

interface GlobalState {
  profile: UserProfile | null;
  notificationPrefs: NotificationPreferences | null;
  permissionState: NotificationPermissionState;
  loading: boolean;
  error: string | null;

  fetchProfile: (userId: string) => Promise<void>;
  refreshPermissionState: () => Promise<NotificationPermissionState>;
  updateEnergyPreference: (preference: 'low' | 'medium' | 'high') => Promise<void>;
  setMasterNotifications: (enabled: boolean) => Promise<{ ok: boolean; permissionDenied?: boolean }>;
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  toggleNotificationType: (type: keyof NotificationTypePrefs, enabled: boolean) => Promise<void>;
  clearStore: () => void;
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  profile: null,
  notificationPrefs: null,
  permissionState: 'undetermined',
  loading: false,
  error: null,

  fetchProfile: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const [profileResult, integrationsResult, permissionState] = await Promise.all([
        supabase
          .from('users')
          .select('*, notification_preferences(*)')
          .eq('id', userId)
          .single(),
        supabase
          .from('integration_accounts_public' as 'integration_accounts')
          .select('provider, status')
          .eq('user_id', userId),
        getNotificationPermissionState(),
      ]);

      if (profileResult.error) throw profileResult.error;

      const accounts = integrationsResult.data ?? [];
      const canvasConnected = accounts.some(
        (a) => a.provider === 'canvas' && a.status === 'connected'
      );
      const googleConnected = accounts.some(
        (a) => a.provider === 'google_calendar' && a.status === 'connected'
      );

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
        notificationPrefs: normalizePrefs(
          profileResult.data.notification_preferences as unknown as Record<string, unknown> | Record<string, unknown>[] | null
        ),
        permissionState,
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

  refreshPermissionState: async () => {
    const permissionState = await getNotificationPermissionState();
    set({ permissionState });
    return permissionState;
  },

  updateEnergyPreference: async (preference: 'low' | 'medium' | 'high') => {
    const { profile } = get();
    if (!profile) return;

    set({ profile: { ...profile, energy_preference: preference } });

    try {
      const { error } = await supabase
        .from('users')
        .update({ energy_preference: preference })
        .eq('id', profile.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating energy preference:', err);
      get().fetchProfile(profile.id);
    }
  },

  setMasterNotifications: async (enabled: boolean) => {
    const { profile, notificationPrefs } = get();
    if (!profile) return { ok: false };

    const updatedPrefs = notificationPrefs
      ? {
          ...notificationPrefs,
          master_toggle: enabled,
          channels: { ...notificationPrefs.channels, push: enabled },
        }
      : {
          master_toggle: enabled,
          channels: { push: enabled, email: true },
          quiet_hours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          },
          types: DEFAULT_TYPES,
        };

    set({ notificationPrefs: updatedPrefs });

    try {
      if (enabled) {
        const permission = await getNotificationPermissionState();
        set({ permissionState: permission });
        if (permission === 'denied') {
          get().fetchProfile(profile.id);
          return { ok: false, permissionDenied: true };
        }

        if (notificationPrefs) {
          await supabase
            .from('notification_preferences')
            .update({
              master_toggle: true,
              channels: { ...notificationPrefs.channels, push: true },
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', profile.id);
        } else {
          await supabase.from('notification_preferences').insert({
            user_id: profile.id,
            master_toggle: true,
            channels: { push: true, email: true },
            quiet_hours: updatedPrefs.quiet_hours,
            types: DEFAULT_TYPES as unknown as Record<string, boolean>,
          });
        }

        await syncPushNotificationState(profile.id);
      } else {
        await disablePushNotifications(profile.id);
        if (notificationPrefs) {
          await supabase
            .from('notification_preferences')
            .update({
              master_toggle: false,
              channels: { ...notificationPrefs.channels, push: false },
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', profile.id);
        }
        set({ permissionState: await getNotificationPermissionState() });
      }

      return { ok: true };
    } catch (err) {
      console.error('Failed to toggle notifications:', err);
      await get().fetchProfile(profile.id);
      return { ok: false };
    }
  },

  updateNotificationPreferences: async (updates: Partial<NotificationPreferences>) => {
    const { profile, notificationPrefs } = get();
    if (!profile) return;

    const merged: NotificationPreferences = {
      ...(notificationPrefs ?? {
        master_toggle: true,
        channels: { push: true, email: true },
        quiet_hours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
        types: DEFAULT_TYPES,
      }),
      ...updates,
      channels: { ...notificationPrefs?.channels, ...updates.channels },
      quiet_hours: { ...notificationPrefs?.quiet_hours, ...updates.quiet_hours },
      types: { ...notificationPrefs?.types, ...updates.types },
    } as NotificationPreferences;

    set({ notificationPrefs: merged });

    try {
      if (notificationPrefs) {
        await supabase
          .from('notification_preferences')
          .update({
            master_toggle: merged.master_toggle,
            channels: merged.channels,
            quiet_hours: merged.quiet_hours,
            types: merged.types as unknown as Record<string, boolean>,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', profile.id);
      } else {
        await supabase.from('notification_preferences').insert({
          user_id: profile.id,
          master_toggle: merged.master_toggle,
          channels: merged.channels,
          quiet_hours: merged.quiet_hours,
          types: merged.types as unknown as Record<string, boolean>,
        });
      }

      if (merged.master_toggle && merged.channels.push) {
        await syncPushNotificationState(profile.id);
      }
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      await get().fetchProfile(profile.id);
    }
  },

  toggleNotificationType: async (type, enabled) => {
    const { notificationPrefs } = get();
    if (!notificationPrefs) return;
    await get().updateNotificationPreferences({
      types: { ...notificationPrefs.types, [type]: enabled },
    });
  },

  clearStore: () => {
    set({
      profile: null,
      notificationPrefs: null,
      permissionState: 'undetermined',
      error: null,
      loading: false,
    });
  },
}));
