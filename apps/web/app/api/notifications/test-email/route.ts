import { NextResponse } from 'next/server';

import { sendTestNotificationEmail } from '@/lib/email';
import {
  canSendNotification,
  type NotificationPreferences,
} from '@/lib/notifications/preferences';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    await sendTestNotificationEmail(userData.email, userData.name || 'there');

    return NextResponse.json({ success: true, message: 'Test email sent successfully' });
  } catch (error) {
    console.error('[notifications/test-email] Failed:', error);
    return NextResponse.json({ error: 'Failed to send test email.' }, { status: 500 });
  }
}
