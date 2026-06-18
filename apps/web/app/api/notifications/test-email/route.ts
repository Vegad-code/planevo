import { NextRequest, NextResponse } from 'next/server';

import { buildEmailIdempotencyKey, sendTestNotificationEmail } from '@/lib/email';
import {
  canSendNotification,
  type NotificationPreferences,
} from '@/lib/notifications/preferences';
import { recordNotificationDelivery, getRecentTestNotificationCount } from '@/lib/notifications/delivery';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
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
      .select('email, name, notification_preferences ( master_toggle, channels, types, quiet_hours )')
      .eq('id', user.id)
      .single();

    if (dbError || !userData?.email) {
      return NextResponse.json({ error: 'Could not find an email address for your account.' }, { status: 400 });
    }

    const preferences = userData.notification_preferences as unknown as NotificationPreferences | null;
    if (!canSendNotification(preferences, 'email', 'system')) {
      return NextResponse.json({ error: 'Email notifications are disabled in your notification settings.' }, { status: 400 });
    }

    const recentCount = await getRecentTestNotificationCount(supabase, user.id, 'email', 168);
    if (recentCount >= 3) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can only send 3 test emails per week to prevent abuse.' },
        { status: 429 }
      );
    }

    const dedupeKey = `test-${Date.now()}`;
    const providerMessageId = await sendTestNotificationEmail(userData.email, userData.name || 'there', {
      idempotencyKey: buildEmailIdempotencyKey('test_email', 'email', user.id, dedupeKey),
    });
    await recordNotificationDelivery(
      supabaseAdmin,
      user.id,
      'test_email',
      'email',
      dedupeKey,
      { provider: 'resend', provider_message_id: providerMessageId ?? null }
    );

    return NextResponse.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('[notifications/test-email] Failed:', error);
    return NextResponse.json({ error: 'Failed to send test email.' }, { status: 500 });
  }
}
