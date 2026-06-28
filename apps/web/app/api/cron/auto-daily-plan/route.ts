import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isCronAuthorized, getCronConfigStatus } from '@/lib/notifications/cron-auth';
import { runAutoDailyPlanSweep } from '@/lib/plan/auto-daily-plan-sweep';
import type { Database } from '@/types/database';

/**
 * GET /api/cron/auto-daily-plan
 *
 * Hourly sweep: sync sources and generate daily plans for users
 * whose local morning time has passed and who have no plan yet.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase admin credentials are not configured' },
      { status: 500 }
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
}
