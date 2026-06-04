import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

function getDeviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
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

/**
 * Requests push notification permissions and registers the
 * Expo push token with Supabase for server-side notifications.
 *
 * Returns the Expo push token string, or null if permission denied.
 */
export async function registerForPushNotifications(
  userId: string,
  options: { persistPreference?: boolean } = {}
): Promise<string | null> {
  const persistPreference = options.persistPreference !== false;

  // Only real devices can receive push notifications
  if (!Device.isDevice) {
    console.warn('[notifications] Push notifications require a physical device.');
    return null;
  }

  // Check / request permissions
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

  // Get the Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId: projectId || undefined,
  });
  const token = tokenResponse.data;

  // Save token to users table
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
    // Ensure notification_preferences is initialized or updated
    const { data: existingPref } = await (supabase as any)
      .from('notification_preferences')
      .select('channels, types, quiet_hours')
      .eq('user_id', userId)
      .single();

    if (existingPref) {
      await (supabase as any)
        .from('notification_preferences')
        .update({
          channels: { ...(existingPref.channels || {}), push: true },
          quiet_hours: {
            ...(existingPref.quiet_hours || {}),
            timezone: existingPref.quiet_hours?.timezone &&
              existingPref.quiet_hours.timezone !== 'UTC'
              ? existingPref.quiet_hours.timezone
              : getDeviceTimezone(),
          },
          types: {
            daily_plan: true,
            deadline_rescue: true,
            weekly_review: true,
            account: true,
            billing: true,
            system: true,
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
          types: {
            daily_plan: true,
            deadline_rescue: true,
            weekly_review: true,
            account: true,
            billing: true,
            system: true,
          },
        });
    }
  }

  // Android requires a notification channel
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
    .select('channels')
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
  // Server-side notifications are authoritative; remove legacy local reminders
  // so users do not receive duplicate morning nudges.
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { data } = await (supabase as any)
    .from('users')
    .select('push_notifications_enabled, notification_preferences(*)')
    .eq('id', userId)
    .single();

  const prefs = data?.notification_preferences;
  const legacyEnabled = data?.push_notifications_enabled !== false;
  const preferencesAllowPush = prefs
    ? prefs.master_toggle !== false && prefs.channels?.push !== false
    : legacyEnabled;

  if (!legacyEnabled || !preferencesAllowPush) {
    return null;
  }

  const token = await registerForPushNotifications(userId, {
    persistPreference: !prefs,
  });

  return token;
}

/**
 * Schedule a daily local notification as a morning planning nudge.
 * This runs on-device and doesn't need the server.
 *
 * @param hour - hour to fire (0-23), default 9
 * @param minute - minute to fire (0-59), default 0
 */
export async function scheduleMorningReminder(hour = 9, minute = 0) {
  // Cancel any existing morning reminders
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🐻 Good morning!',
      body: "Let's check what's on your plate today. Tap to see your plan.",
      data: { screen: 'index' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
