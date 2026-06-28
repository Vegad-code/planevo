import type { SupabaseClient } from '@supabase/supabase-js';
import { generateDailyPlan } from '@/lib/ai/generate-daily-plan';
import {
  AUTO_PLAN_CONCURRENCY,
  forEachUserBatch,
  mapWithConcurrency,
} from '@/lib/cron/batch-users';
import { syncSourcesForUser } from '@/lib/plan/sync-sources';
import { hasLockedPlanToday } from '@/lib/plan/day-plan';
import {
  DEFAULT_MORNING_TIME,
  getLocalDateKey,
  isPastLocalTime,
  normalizeNotificationPreferences,
} from '@/lib/notifications/preferences';
import { hasNotificationDelivery, recordNotificationDelivery } from '@/lib/notifications/delivery';
import type { Database, Tables } from '@/types/database';

type AdminClient = SupabaseClient<Database>;

export interface AutoPlanSweepUser {
  id: string;
  preferred_morning_time: string | null;
  onboarding_complete: boolean | null;
  notification_preferences: unknown;
  scheduling_preferences: unknown;
}

export interface AutoPlanSweepResult {
  users_processed: number;
  plans_generated: number;
  plans_skipped: number;
  sync_errors: number;
  generation_errors: number;
}

function getUserTimezone(user: AutoPlanSweepUser): string {
  const prefs = normalizeNotificationPreferences(
    user.notification_preferences as Parameters<typeof normalizeNotificationPreferences>[0]
  );
  const scheduling = user.scheduling_preferences as { timezone?: string } | null;
  return scheduling?.timezone ?? prefs.quiet_hours.timezone ?? 'UTC';
}

function isEligibleForAutopilot(
  user: AutoPlanSweepUser,
  now: Date,
  todayRows: Tables<'calendar_events'>[]
): boolean {
  if (!user.onboarding_complete) {
    return false;
  }

  const timezone = getUserTimezone(user);
  const morningTime = user.preferred_morning_time || DEFAULT_MORNING_TIME;

  if (!isPastLocalTime(now, timezone, morningTime)) {
    return false;
  }

  if (hasLockedPlanToday(todayRows)) {
    return false;
  }

  const hasPendingOrAcceptedAi = todayRows.some(
    (row) => row.is_ai_suggested === true && row.status !== 'rejected'
  );
  if (hasPendingOrAcceptedAi) {
    return false;
  }

  return true;
}

async function processAutoPlanUser(
  supabase: AdminClient,
  user: AutoPlanSweepUser,
  now: Date,
  result: AutoPlanSweepResult
): Promise<void> {
  const timezone = getUserTimezone(user);
  const dedupeKey = getLocalDateKey(now, timezone);

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: todayRows } = await supabase
    .from('calendar_events')
    .select('id, is_ai_suggested, status, start_time, metadata')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .neq('status', 'rejected')
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString());

  if (!isEligibleForAutopilot(user, now, (todayRows ?? []) as Tables<'calendar_events'>[])) {
    result.plans_skipped += 1;
    return;
  }

  if (await hasNotificationDelivery(supabase, user.id, 'auto_daily_plan', 'push', dedupeKey)) {
    result.plans_skipped += 1;
    return;
  }

  const syncResult = await syncSourcesForUser(user.id);
  if (syncResult.errors.length > 0) {
    result.sync_errors += 1;
  }

  try {
    const planResult = await generateDailyPlan({
      userId: user.id,
      timezone,
      localTime: now.toISOString(),
      trigger: 'cron',
    });

    if (planResult.skipped) {
      result.plans_skipped += 1;
      return;
    }

    await recordNotificationDelivery(
      supabase,
      user.id,
      'auto_daily_plan',
      'push',
      dedupeKey,
      { plan_size: planResult.plan.length, overflow: planResult.overflow }
    );

    result.plans_generated += 1;
  } catch (err) {
    result.generation_errors += 1;
    console.error(`[auto-daily-plan] Generation failed for ${user.id}:`, err);
  }
}

export async function runAutoDailyPlanSweep(
  supabase: AdminClient,
  now: Date = new Date()
): Promise<AutoPlanSweepResult> {
  const result: AutoPlanSweepResult = {
    users_processed: 0,
    plans_generated: 0,
    plans_skipped: 0,
    sync_errors: 0,
    generation_errors: 0,
  };

  result.users_processed = await forEachUserBatch<AutoPlanSweepUser>(
    supabase,
    `
      id,
      preferred_morning_time,
      onboarding_complete,
      scheduling_preferences,
      notification_preferences ( master_toggle, channels, types, quiet_hours )
    `,
    async (batchUsers) => {
      await mapWithConcurrency(batchUsers, AUTO_PLAN_CONCURRENCY, async (user) => {
        await processAutoPlanUser(supabase, user, now, result);
      });
    },
    {
      filter: (query) => query.eq('onboarding_complete', true),
    }
  );

  return result;
}
