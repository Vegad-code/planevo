import { NextResponse } from 'next/server';

import { withCron } from '@/lib/api/route-helpers';
import { getCronConfigStatus } from '@/lib/notifications/cron-auth';
import { runAutoDailyPlanSweep } from '@/lib/plan/auto-daily-plan-sweep';

/**
 * GET /api/cron/auto-daily-plan
 *
 * Hourly sweep: sync sources and generate daily plans for users
 * whose local morning time has passed and who have no plan yet.
 */
export const GET = withCron(async ({ supabase }) => {
  try {
    const result = await runAutoDailyPlanSweep(supabase);

    return NextResponse.json({
      message: 'Auto daily plan sweep completed',
      config: getCronConfigStatus(),
      ...result,
    });
  } catch (error) {
    console.error('[cron/auto-daily-plan] Fatal error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
});
