import { NextResponse } from 'next/server';

import { withCron } from '@/lib/api/route-helpers';
import { runWeeklyReviewSweep } from '@/lib/notifications/weekly-review';

/**
 * GET /api/cron/weekly-review
 *
 * Manual or external trigger for weekly review emails.
 * Production scheduling is handled by /api/cron/daily-notifications on Sundays.
 */
export const GET = withCron(async ({ supabase }) => {
  try {
    const result = await runWeeklyReviewSweep(supabase);
    return NextResponse.json({
      message: `Weekly review sent to ${result.sent} users, ${result.failed} failed`,
      ...result,
    });
  } catch (error) {
    console.error('[cron/weekly-review] Fatal error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
});
