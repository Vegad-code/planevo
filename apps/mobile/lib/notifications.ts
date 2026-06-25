import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

function getDeviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function normalizePrefsRow(
  prefs: Record<string, unknown> | Record<string, unknown>[] | null | undefined
) {
  if (Array.isArray(prefs)) {
    return (prefs[0] as Record<string, unknown> | undefined) ?? null;
  }
  return prefs ?? null;
}

/**
 * Configure notification behavior (show even when app is foregrounded).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const permission = await Notifications.getPermissionsAsync();
  const granted = (permission as { granted?: boolean; status?: string }).granted === true
    || (permission as { granted?: boolean; status?: string }).status === 'granted';

  if (granted) return 'granted';

  const status = (permission as { status?: string }).status;
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function openNotificationSettings() {
  await Linking.openSettings();
}

/**
 * Requests push notification permissions and registers the
 * Expo push token with Supabase for server-side notifications.
 */
export async function registerForPushNotifications(
  userId: string,
  options: { persistPreference?: boolean } = {}
): Promise<string | null> {
  const persistPreference = options.persistPreference !== false;

  if (!Device.isDevice) {
    console.warn('[notifications] Push notifications require a physical device.');
    return null;
  }

  const existingPerm = await Notifications.getPermissionsAsync();
  let isGranted = (existingPerm as { granted?: boolean; status?: string }).granted === true
    || (existingPerm as { granted?: boolean; status?: string }).status === 'granted';

  if (!isGranted) {
    const newPerm = await Notifications.requestPermissionsAsync();
    isGranted = (newPerm as { granted?: boolean; status?: string }).granted === true
      || (newPerm as { granted?: boolean; status?: string }).status === 'granted';
  }

  if (!isGranted) {
    console.warn('[notifications] Permission denied.');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId: projectId || undefined,
  });
  const token = tokenResponse.data;

  const { error: userError } = await (supabase as any)
    .from('users')
    .update({
      expo_push_token: token,
      push_notifications_enabled: true,
    })
    .eq('id', userId);

  if (userError) {
    console.error('[notifications] Failed to save push token to users:', userError);
  }

  if (persistPreference) {
    const { data: existingPref } = await (supabase as any)
      .from('notification_preferences')
      .select('channels, types, quiet_hours')
      .eq('user_id', userId)
      .single();

    const defaultTypes = {
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

    if (existingPref) {
      await (supabase as any)
        .from('notification_preferences')
        .update({
          master_toggle: true,
          channels: { ...(existingPref.channels || {}), push: true },
          quiet_hours: {
            ...(existingPref.quiet_hours || {}),
            timezone: existingPref.quiet_hours?.timezone &&
              existingPref.quiet_hours.timezone !== 'UTC'
              ? existingPref.quiet_hours.timezone
              : getDeviceTimezone(),
          },
          types: {
            ...defaultTypes,
            ...(existingPref.types || {}),
          },
        })
        .eq('user_id', userId);
    } else {
      await (supabase as any)
        .from('notification_preferences')
        .insert({
          user_id: userId,
          master_toggle: true,
          channels: { push: true, email: true },
          quiet_hours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
            timezone: getDeviceTimezone(),
          },
          types: defaultTypes,
        });
    }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Planevo',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#d4a574',
    });
  }

  return token;
}

export async function disablePushNotifications(userId: string) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await (supabase as any)
    .from('users')
    .update({
      expo_push_token: null,
      push_notifications_enabled: false,
    })
    .eq('id', userId);

  const { data: existingPref } = await (supabase as any)
    .from('notification_preferences')
    .select('channels, master_toggle')
    .eq('user_id', userId)
    .single();

  if (existingPref) {
    await (supabase as any)
      .from('notification_preferences')
      .update({
        channels: { ...(existingPref.channels || {}), push: false },
      })
      .eq('user_id', userId);
  }
}

export async function syncPushNotificationState(userId: string) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { data } = await (supabase as any)
    .from('users')
    .select('push_notifications_enabled, notification_preferences(*)')
    .eq('id', userId)
    .single();

  const prefs = normalizePrefsRow(data?.notification_preferences);
  const legacyEnabled = data?.push_notifications_enabled !== false;
  const preferencesAllowPush = prefs
    ? prefs.master_toggle !== false && (prefs.channels as { push?: boolean } | undefined)?.push !== false
    : legacyEnabled;

  if (!legacyEnabled || !preferencesAllowPush) {
    return null;
  }

  return registerForPushNotifications(userId, {
    persistPreference: !prefs,
  });
}
