import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { getLastAutomatedEmailDelivery } from './delivery';
import {
  canSendNotification,
  getLocalDateKey,
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from './preferences';

const PAID_PLAN_TYPES = new Set(['trialing', 'premium', 'admin', 'student']);

export interface NotificationDeliveryInsight {
  lastAutomatedEmail: {
    type: string;
    sentAt: string;
  } | null;
  lastAutomatedPush: {
    type: string;
    sentAt: string;
  } | null;
  timezone: string;
  timezoneIsUtcDefault: boolean;
  planType: string;
  tasksDueToday: number;
  tasksDueSoon: number;
  upcomingEvents: number;
  emailEnabled: boolean;
  pushEnabled: boolean;
  skipReasons: string[];
}

function countTasksDueSoon(
  tasks: Array<{ due_date: string | null }>,
  timezone: string,
  now: Date
): { dueToday: number; dueSoon: number } {
  const localToday = getLocalDateKey(now, timezone);
  let dueToday = 0;
  let dueSoon = 0;

  for (const task of tasks) {
    if (!task.due_date) continue;
    const localDueDate = getLocalDateKey(new Date(task.due_date), timezone);
    if (localDueDate === localToday) {
      dueToday += 1;
      continue;
    }

    const daysUntilDue = Math.floor(
      (Date.parse(`${localDueDate}T12:00:00.000Z`) - Date.parse(`${localToday}T12:00:00.000Z`))
      / (24 * 60 * 60 * 1000)
    );
    if (daysUntilDue >= 1 && daysUntilDue <= 3) {
      dueSoon += 1;
    }
  }

  return { dueToday, dueSoon };
}

export async function getNotificationDeliveryInsight(
  supabase: SupabaseClient<Database>,
  userId: string,
  preferences: Partial<NotificationPreferences> | null,
  planType: string
): Promise<NotificationDeliveryInsight> {
  const normalizedPrefs = normalizeNotificationPreferences(preferences);
  const timezone = normalizedPrefs.quiet_hours.timezone;
  const now = new Date();
  const skipReasons: string[] = [];

  const [{ data: tasks }, { count: upcomingEvents }, lastAutomatedEmail, { data: lastAutomatedPush }, { data: userRow }] = await Promise.all([
    supabase
      .from('tasks')
      .select('due_date')
      .eq('user_id', userId)
      .in('status', ['todo', 'in_progress'])
      .is('deleted_at', null)
      .gte('due_date', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .lte('due_date', new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('start_time', now.toISOString())
      .lte('start_time', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()),
    getLastAutomatedEmailDelivery(supabase, userId),
    supabase
      .from('notification_deliveries')
      .select('notification_type, sent_at')
      .eq('user_id', userId)
      .eq('channel', 'push')
      .neq('notification_type', 'test_push')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('users')
      .select('expo_push_token')
      .eq('id', userId)
      .single(),
  ]);

  const { dueToday, dueSoon } = countTasksDueSoon(tasks ?? [], timezone, now);
  const emailEnabled = canSendNotification(preferences, 'email', 'daily_plan');
  const pushEnabled = canSendNotification(preferences, 'push', 'daily_plan');

  if (!normalizedPrefs.master_toggle) {
    skipReasons.push('Notifications are turned off in your settings.');
  } else if (!normalizedPrefs.channels.email) {
    skipReasons.push('Email delivery is disabled in your settings.');
  }

  if (!normalizedPrefs.channels.push) {
    skipReasons.push('Push delivery is disabled in your settings.');
  }

  if (!userRow?.expo_push_token) {
    skipReasons.push('No mobile push token is registered. Open the Planevo mobile app and enable notifications on a physical device.');
  }

  if (timezone === 'UTC') {
    skipReasons.push('Your notification timezone is still UTC. Planevo will send morning and evening emails on UTC time until you choose your local timezone below.');
  }

  if (dueToday === 0) {
    skipReasons.push('No incomplete tasks are due today, so morning plan and deadline rescue emails will not send.');
  }

  if (dueSoon === 0 && (upcomingEvents ?? 0) === 0) {
    skipReasons.push('No tasks due in the next 3 days and no calendar events in the next 24 hours, so upcoming reminder emails will not send.');
  }

  if (!PAID_PLAN_TYPES.has(planType)) {
    skipReasons.push('Weekly review emails are only sent on paid plans.');
  }

  if (!lastAutomatedEmail) {
    skipReasons.push('No automated Planevo emails have been logged for this account yet. Scheduled emails run twice daily after deployment.');
  }

  if (!lastAutomatedPush) {
    skipReasons.push('No automated push notifications have been logged yet. Enable push on mobile and wait for the next scheduled sweep.');
  }

  return {
    lastAutomatedEmail: lastAutomatedEmail
      ? {
          type: lastAutomatedEmail.notification_type,
          sentAt: lastAutomatedEmail.sent_at,
        }
      : null,
    lastAutomatedPush: lastAutomatedPush
      ? {
          type: lastAutomatedPush.notification_type,
          sentAt: lastAutomatedPush.sent_at,
        }
      : null,
    timezone,
    timezoneIsUtcDefault: timezone === 'UTC',
    planType,
    tasksDueToday: dueToday,
    tasksDueSoon: dueSoon,
    upcomingEvents: upcomingEvents ?? 0,
    emailEnabled,
    pushEnabled,
    skipReasons,
  };
}
