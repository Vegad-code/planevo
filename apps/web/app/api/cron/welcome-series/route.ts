import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildEmailIdempotencyKey, sendWelcomeEmail } from '@/lib/email';
import { canSendNotification, type NotificationPreferences } from '@/lib/notifications/preferences';
import {
  hasNotificationDelivery,
  recordNotificationDelivery,
} from '@/lib/notifications/delivery';

type WelcomeUser = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  notification_preferences: Partial<NotificationPreferences> | null;
};

/**
 * GET /api/cron/welcome-series
 *
 * Vercel Cron job - runs daily.
 * Finds users created 1 day ago and 3 days ago, and sends them
 * the respective welcome series email.
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Get bounds for 1 day ago
    const day1Start = new Date(todayStart);
    day1Start.setDate(day1Start.getDate() - 1);
    const day1End = new Date(day1Start);
    day1End.setUTCHours(23, 59, 59, 999);

    // Get bounds for 3 days ago
    const day3Start = new Date(todayStart);
    day3Start.setDate(day3Start.getDate() - 3);
    const day3End = new Date(day3Start);
    day3End.setUTCHours(23, 59, 59, 999);

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, created_at, notification_preferences ( master_toggle, channels, types, quiet_hours )')
      .or(`and(created_at.gte.${day1Start.toISOString()},created_at.lte.${day1End.toISOString()}),and(created_at.gte.${day3Start.toISOString()},created_at.lte.${day3End.toISOString()})`);

    if (error) {
      throw error;
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users require welcome emails today', sent: 0 });
    }

    const emailPromises: Promise<void>[] = [];
    let sentEmails = 0;

    for (const user of users as unknown as WelcomeUser[]) {
      if (!user.email) continue;
      if (!canSendNotification(user.notification_preferences, 'email', 'account')) {
        continue;
      }

      const createdAt = new Date(user.created_at);
      const isDay1 = createdAt >= day1Start && createdAt <= day1End;
      const day = isDay1 ? 1 : 3;
      const dedupeKey = `day-${day}`;

      if (await hasNotificationDelivery(supabase, user.id, 'welcome_series', 'email', dedupeKey)) {
        continue;
      }

      emailPromises.push(
        sendWelcomeEmail(user.email, user.name || 'Pilot', day, {
          idempotencyKey: buildEmailIdempotencyKey('welcome_series', 'email', user.id, dedupeKey),
        })
          .then((providerMessageId) => recordNotificationDelivery(
            supabase,
            user.id,
            'welcome_series',
            'email',
            dedupeKey,
            { provider: 'resend', provider_message_id: providerMessageId ?? null, day }
          ))
          .then(() => {
            sentEmails++;
          })
          .catch(err => {
            console.error(`Failed to send Day ${day} welcome email to ${user.email}:`, err);
          })
      );
    }

    await Promise.all(emailPromises);

    return NextResponse.json({
      message: `Sent ${sentEmails} welcome series emails`,
      sent: sentEmails,
    });
  } catch (error) {
    console.error('[cron/welcome-series] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
