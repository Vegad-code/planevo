import { NextResponse } from 'next/server';

import { withCron } from '@/lib/api/route-helpers';
import { getCronConfigStatus } from '@/lib/notifications/cron-auth';
import { runDailyNotificationSweep } from '@/lib/notifications/daily-sweep';
import { runWeeklyReviewSweep } from '@/lib/notifications/weekly-review';

/**
 * GET /api/cron/daily-notifications
 *
 * Hobby-compatible notification sweep. Runs twice daily via Vercel Cron:
 * - 14:00 UTC for morning/upcoming catch-up
 * - 02:00 UTC for evening deadline rescue catch-up
 *
 * On Sundays, also runs the weekly review sweep during the 14:00 UTC invocation.
 */
export const GET = withCron(async ({ supabase }) => {
  try {
    const result = await runDailyNotificationSweep(supabase);
    const now = new Date();
    const shouldRunWeeklyReview = now.getUTCDay() === 0 && now.getUTCHours() >= 14;
    const weeklyReview = shouldRunWeeklyReview
      ? await runWeeklyReviewSweep(supabase).catch((error) => {
          console.error('[cron/daily-notifications] Weekly review failed:', error);
          return { sent: 0, failed: 0, total: 0 };
        })
      : null;

    return NextResponse.json({
      message: 'Daily notification sweep completed',
      config: getCronConfigStatus(),
      ...result,
      weekly_review: weeklyReview,
    });
  } catch (error) {
    console.error('[cron/daily-notifications] Fatal error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
});
