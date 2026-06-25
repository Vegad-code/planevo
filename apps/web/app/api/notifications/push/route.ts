import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { isCronAuthorized } from '@/lib/notifications/cron-auth';
import { runDailyNotificationSweep } from '@/lib/notifications/daily-sweep';
import { Database } from '@/types/database';

/**
 * Legacy route kept for backwards compatibility.
 * Production scheduling now uses /api/cron/daily-notifications.
 */
async function handleLegacySweep(request: NextRequest) {
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

  const result = await runDailyNotificationSweep(supabase);

  return NextResponse.json({
    message: `Sent ${result.sent_push} morning push notifications, and ${result.sent_morning_emails} emails`,
    sent_push: result.sent_push,
    failed_push: result.failed_push,
    sent_emails: result.sent_morning_emails,
    total_users_targeted: result.users_processed,
    delegated_to: '/api/cron/daily-notifications',
  });
}

export async function GET(request: NextRequest) {
  try {
    return await handleLegacySweep(request);
  } catch (error) {
    console.error('[notifications/push] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
