import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { isCronAuthorized, getCronConfigStatus } from '@/lib/notifications/cron-auth';
import { runDailyNotificationSweep } from '@/lib/notifications/daily-sweep';
import { runWeeklyReviewSweep } from '@/lib/notifications/weekly-review';
import { Database } from '@/types/database';

/**
 * GET /api/cron/daily-notifications
 *
 * Hobby-compatible notification sweep. Runs twice daily via Vercel Cron:
 * - 14:00 UTC for morning/upcoming catch-up
 * - 02:00 UTC for evening deadline rescue catch-up
 *
 * On Sundays, also runs the weekly review sweep during the 14:00 UTC invocation.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase admin credentials are not configured' }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
}
