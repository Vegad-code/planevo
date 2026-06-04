import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  canSendNotification,
  type NotificationPreferences,
} from '@/lib/notifications/preferences';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('expo_push_token, name, notification_preferences ( master_toggle, channels, types, quiet_hours )')
      .eq('id', user.id)
      .single();

    if (dbError || !userData) {
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    const preferences = userData.notification_preferences as unknown as NotificationPreferences | null;
    if (!canSendNotification(preferences, 'push', 'system')) {
      return NextResponse.json({ error: 'Push notifications are disabled in your notification settings.' }, { status: 400 });
    }

    if (!userData.expo_push_token) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[notifications/test] Development mode: No Expo push token found, returning simulated success.');
        return NextResponse.json({ success: true, message: 'Simulated test notification (dev mode: no token)' });
      }
      return NextResponse.json({ error: 'No Expo push token found. Please enable notifications on your mobile device first.' }, { status: 400 });
    }

    const message = {
      to: userData.expo_push_token,
      sound: 'default',
      title: 'Planevo Test Notification',
      body: `Hi ${userData.name || 'there'}! This is a test notification to verify your setup.`,
      data: { screen: 'index' },
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('[notifications/test] Expo Push API error:', await response.text());
      return NextResponse.json({ error: 'Failed to send push notification via Expo' }, { status: 502 });
    }

    const result = await response.json();

    // Check if there's a specific error from Expo (e.g., DeviceNotRegistered)
    if (result.data?.status === 'error') {
       if (result.data.details?.error === 'DeviceNotRegistered') {
         // Clean up stale token
         await supabase.from('users').update({ expo_push_token: null }).eq('id', user.id);
         return NextResponse.json({ error: 'Device token is no longer valid. Please re-enable notifications on your mobile device.' }, { status: 400 });
       }
       return NextResponse.json({ error: `Expo Error: ${result.data.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Test notification sent successfully' });
  } catch (err: unknown) {
    console.error('[notifications/test] Unhandled error:', err);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
