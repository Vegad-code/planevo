import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import {
  canSendNotification,
  type NotificationPreferences,
} from '@/lib/notifications/preferences';
import { recordNotificationDelivery, getRecentTestNotificationCount } from '@/lib/notifications/delivery';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const auth = await createAuthenticatedSupabaseClient(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabase, user } = auth;

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

    const recentCount = await getRecentTestNotificationCount(supabase, user.id, 'push', 168);
    if (recentCount >= 3) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can only send 3 test push notifications per week to prevent abuse.' },
        { status: 429 }
      );
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

    if (result.data?.status === 'error') {
      if (result.data.details?.error === 'DeviceNotRegistered') {
        await supabase.from('users').update({ expo_push_token: null }).eq('id', user.id);
        return NextResponse.json({ error: 'Device token is no longer valid. Please re-enable notifications on your mobile device.' }, { status: 400 });
      }
      return NextResponse.json({ error: `Expo Error: ${result.data.message}` }, { status: 400 });
    }

    const dedupeKey = `test-${Date.now()}`;
    await recordNotificationDelivery(
      supabaseAdmin,
      user.id,
      'test_push',
      'push',
      dedupeKey,
      { provider: 'expo', ticket_id: result.data?.id ?? null }
    );

    return NextResponse.json({ success: true, message: 'Test notification sent successfully' });
  } catch (err: unknown) {
    console.error('[notifications/test] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
