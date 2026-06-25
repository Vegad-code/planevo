import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { isCronAuthorized } from '@/lib/notifications/cron-auth';
import { runWeeklyReviewSweep } from '@/lib/notifications/weekly-review';
import { Database } from '@/types/database';

/**
 * GET /api/cron/weekly-review
 *
 * Manual or external trigger for weekly review emails.
 * Production scheduling is handled by /api/cron/daily-notifications on Sundays.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
}
