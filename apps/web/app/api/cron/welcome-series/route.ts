import { NextResponse } from 'next/server';

import { withCron } from '@/lib/api/route-helpers';
import { runDailyNotificationSweep } from '@/lib/notifications/daily-sweep';

/**
 * Legacy route kept for backwards compatibility.
 * Welcome emails are now sent by /api/cron/daily-notifications.
 */
export const GET = withCron(async ({ supabase }) => {
  try {
    const result = await runDailyNotificationSweep(supabase);

    return NextResponse.json({
      message: `Sent ${result.sent_welcome_emails} welcome series emails`,
      sent: result.sent_welcome_emails,
      delegated_to: '/api/cron/daily-notifications',
    });
  } catch (error) {
    console.error('[cron/welcome-series] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
