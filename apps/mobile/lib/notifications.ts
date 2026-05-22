import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

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
  userId: string
): Promise<string | null> {
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

  // Save to Supabase
  const { error } = await (supabase as any)
    .from('users')
    .update({
      expo_push_token: token,
      push_notifications_enabled: true,
    })
    .eq('id', userId);

  if (error) {
    console.error('[notifications] Failed to save push token:', error);
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
