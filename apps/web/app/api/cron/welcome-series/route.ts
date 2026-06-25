import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { isCronAuthorized } from '@/lib/notifications/cron-auth';
import { runDailyNotificationSweep } from '@/lib/notifications/daily-sweep';
import { Database } from '@/types/database';

/**
 * Legacy route kept for backwards compatibility.
 * Welcome emails are now sent by /api/cron/daily-notifications.
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
}
