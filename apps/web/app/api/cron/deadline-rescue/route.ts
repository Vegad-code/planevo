import { NextResponse } from 'next/server';

import { withCron } from '@/lib/api/route-helpers';
import { runDailyNotificationSweep } from '@/lib/notifications/daily-sweep';

/**
 * Legacy route kept for backwards compatibility.
 * Production scheduling now uses /api/cron/daily-notifications.
 */
export const GET = withCron(async ({ supabase }) => {
  try {
    const result = await runDailyNotificationSweep(supabase);

    return NextResponse.json({
      message: `Sent ${result.sent_push} deadline rescue notifications, and ${result.sent_deadline_emails} emails`,
      sent_push: result.sent_push,
      failed_push: result.failed_push,
      sent_emails: result.sent_deadline_emails,
      delegated_to: '/api/cron/daily-notifications',
    });
  } catch (error) {
    console.error('[cron/deadline-rescue] Fatal error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
});
