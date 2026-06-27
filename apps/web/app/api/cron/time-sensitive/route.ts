import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { forEachUserBatch } from '@/lib/cron/batch-users';
import { isCronAuthorized, getCronConfigStatus } from '@/lib/notifications/cron-auth';
import { dispatchPushCandidates } from '@/lib/notifications/post-sync-notify';
import {
  normalizeNotificationPreferences,
  parseNotificationPreferencesRow,
} from '@/lib/notifications/preferences';
import { collectTimeSensitivePushCandidates } from '@/lib/notifications/time-sensitive-sweep';
import type { PushCandidate } from '@/lib/notifications/push-dispatch';
import { Database } from '@/types/database';

type TimeSensitiveBatchUser = {
  id: string;
  name: string | null;
  expo_push_token: string | null;
  notification_preferences: unknown;
};

/**
 * GET /api/cron/time-sensitive
 *
 * Optional hourly sweep for calendar events starting within the hour.
 * Requires Vercel Pro or an external scheduler if used hourly.
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
    const now = new Date();
    const candidates: PushCandidate[] = [];
    const usersByTimezone = new Map<string, { timezone: string }>();
    let usersProcessed = 0;

    await forEachUserBatch<TimeSensitiveBatchUser>(
      supabase,
      `
        id, name, expo_push_token,
        notification_preferences ( master_toggle, channels, types, quiet_hours )
      `,
      async (batch) => {
        usersProcessed += batch.length;
        const sweepUsers = batch.map((user) => ({
          id: user.id,
          name: user.name,
          expo_push_token: user.expo_push_token,
          notification_preferences: parseNotificationPreferencesRow(
            Array.isArray(user.notification_preferences)
              ? user.notification_preferences[0]
              : user.notification_preferences
          ),
        }));

        const batchCandidates = await collectTimeSensitivePushCandidates(
          supabase,
          sweepUsers,
          now
        );
        candidates.push(...batchCandidates);

        for (const user of sweepUsers) {
          usersByTimezone.set(user.id, {
            timezone: normalizeNotificationPreferences(user.notification_preferences).quiet_hours
              .timezone,
          });
        }
      },
      {
        filter: (query) => query.not('expo_push_token', 'is', null),
      }
    );

    const pushResult =
      candidates.length > 0
        ? await dispatchPushCandidates(supabase, candidates, usersByTimezone)
        : { sent: 0, failed: 0 };

    return NextResponse.json({
      message: 'Time-sensitive notification sweep completed',
      config: getCronConfigStatus(),
      users_processed: usersProcessed,
      candidates: candidates.length,
      sent_push: pushResult.sent,
      failed_push: pushResult.failed,
    });
  } catch (error) {
    console.error('[cron/time-sensitive] Fatal error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
