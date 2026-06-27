import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildEmailIdempotencyKey,
  sendDeadlineRescueEmail,
  sendMorningPlanEmail,
  sendUpcomingRemindersEmail,
  sendWelcomeEmail,
  type UpcomingReminderItem,
} from '@/lib/email';
import type { Database } from '@/types/database';

import { forEachUserBatch } from '@/lib/cron/batch-users';
import {
  hasNotificationDelivery,
  recordNotificationDelivery,
} from './delivery';
import { dispatchPushCandidates } from './post-sync-notify';
import type { PushCandidate } from './push-dispatch';
import { collectIntegrationDigestCandidates } from './source-sweep';
import {
  canSendNotification,
  DEFAULT_EVENING_TIME,
  DEFAULT_MORNING_TIME,
  getLocalDateKey,
  isPastLocalTime,
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from './preferences';

type SweepUser = {
  id: string;
  name: string | null;
  email: string | null;
  expo_push_token: string | null;
  preferred_morning_time: string | null;
  created_at: string;
  notification_preferences: Partial<NotificationPreferences> | null;
};

type TaskRow = {
  user_id: string;
  title: string;
  due_date: string | null;
};

type CalendarRow = {
  user_id: string | null;
  title: string;
  start_time: string;
  is_ai_suggested: boolean | null;
  source: string | null;
  status: string | null;
};

export type DailySweepResult = {
  sent_morning_emails: number;
  sent_deadline_emails: number;
  sent_upcoming_emails: number;
  sent_welcome_emails: number;
  sent_push: number;
  failed_push: number;
  users_processed: number;
};

function formatDueLabel(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return formatter.format(date);
}

function formatEventLabel(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return formatter.format(date);
}

function getWelcomeDay(createdAt: string, now: Date): 1 | 3 | null {
  const created = new Date(createdAt);
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const day1Start = new Date(todayStart);
  day1Start.setDate(day1Start.getDate() - 1);
  const day1End = new Date(day1Start);
  day1End.setUTCHours(23, 59, 59, 999);

  const day3Start = new Date(todayStart);
  day3Start.setDate(day3Start.getDate() - 3);
  const day3End = new Date(day3Start);
  day3End.setUTCHours(23, 59, 59, 999);

  if (created >= day1Start && created <= day1End) return 1;
  if (created >= day3Start && created <= day3End) return 3;
  return null;
}

export async function runDailyNotificationSweep(
  supabase: SupabaseClient<Database>
): Promise<DailySweepResult> {
  const now = new Date();
  const result: DailySweepResult = {
    sent_morning_emails: 0,
    sent_deadline_emails: 0,
    sent_upcoming_emails: 0,
    sent_welcome_emails: 0,
    sent_push: 0,
    failed_push: 0,
    users_processed: 0,
  };

  const pushCandidates: PushCandidate[] = [];
  const emailPromises: Promise<void>[] = [];
  const usersByTimezone = new Map<string, { timezone: string }>();

  result.users_processed = await forEachUserBatch<SweepUser>(
    supabase,
    `
      id, name, email, expo_push_token, preferred_morning_time, created_at,
      notification_preferences ( master_toggle, channels, types, quiet_hours )
    `,
    async (batchUsers) => {
      const batchOutcome = await processDailyNotificationUserBatch(
        supabase,
        batchUsers,
        now
      );
      result.sent_morning_emails += batchOutcome.sent_morning_emails;
      result.sent_deadline_emails += batchOutcome.sent_deadline_emails;
      result.sent_upcoming_emails += batchOutcome.sent_upcoming_emails;
      result.sent_welcome_emails += batchOutcome.sent_welcome_emails;
      pushCandidates.push(...batchOutcome.pushCandidates);
      emailPromises.push(...batchOutcome.emailPromises);
      for (const [userId, value] of batchOutcome.usersByTimezone) {
        usersByTimezone.set(userId, value);
      }

      const integrationCandidates = await collectIntegrationDigestCandidates(
        supabase,
        batchUsers,
        now
      );
      pushCandidates.push(...integrationCandidates);
    }
  );

  if (result.users_processed === 0) {
    return result;
  }

  await Promise.all(emailPromises);

  if (pushCandidates.length > 0) {
    const pushResult = await dispatchPushCandidates(supabase, pushCandidates, usersByTimezone);
    result.sent_push = pushResult.sent;
    result.failed_push = pushResult.failed;
  }

  return result;
}

type BatchOutcome = {
  sent_morning_emails: number;
  sent_deadline_emails: number;
  sent_upcoming_emails: number;
  sent_welcome_emails: number;
  pushCandidates: PushCandidate[];
  emailPromises: Promise<void>[];
  usersByTimezone: Map<string, { timezone: string }>;
};

async function processDailyNotificationUserBatch(
  supabase: SupabaseClient<Database>,
  sweepUsers: SweepUser[],
  now: Date
): Promise<BatchOutcome> {
  const outcome: BatchOutcome = {
    sent_morning_emails: 0,
    sent_deadline_emails: 0,
    sent_upcoming_emails: 0,
    sent_welcome_emails: 0,
    pushCandidates: [],
    emailPromises: [],
    usersByTimezone: new Map(),
  };

  if (sweepUsers.length === 0) {
    return outcome;
  }

  const userIds = sweepUsers.map((user) => user.id);
  const queryStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const queryEnd = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const eventEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const [{ data: tasks, error: tasksError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase
        .from('tasks')
        .select('user_id, title, due_date')
        .in('user_id', userIds)
        .in('status', ['todo', 'in_progress'])
        .is('deleted_at', null)
        .gte('due_date', queryStart)
        .lte('due_date', queryEnd),
      supabase
        .from('calendar_events')
        .select('user_id, title, start_time, is_ai_suggested, source, status')
        .in('user_id', userIds)
        .eq('is_deleted', false)
        .neq('status', 'rejected')
        .gte('start_time', now.toISOString())
        .lte('start_time', eventEnd),
    ]);

  if (tasksError) throw tasksError;
  if (eventsError) throw eventsError;

  const tasksDueToday = new Map<string, { count: number; titles: string[] }>();
  const upcomingTasks = new Map<string, UpcomingReminderItem[]>();
  const upcomingEvents = new Map<string, UpcomingReminderItem[]>();
  const nextPlanBlock = new Map<string, { title: string; timeLabel: string }>();
  const usersById = new Map(sweepUsers.map((user) => [user.id, user]));

  for (const task of (tasks ?? []) as TaskRow[]) {
    if (!task.due_date) continue;
    const user = usersById.get(task.user_id);
    if (!user) continue;

    const timezone = normalizeNotificationPreferences(user.notification_preferences).quiet_hours.timezone;
    const dueDate = new Date(task.due_date);
    const localToday = getLocalDateKey(now, timezone);
    const localDueDate = getLocalDateKey(dueDate, timezone);

    if (localDueDate === localToday) {
      const current = tasksDueToday.get(task.user_id) ?? { count: 0, titles: [] };
      current.count += 1;
      current.titles.push(task.title);
      tasksDueToday.set(task.user_id, current);
      continue;
    }

    const daysUntilDue = Math.floor(
      (Date.parse(`${localDueDate}T12:00:00.000Z`) - Date.parse(`${localToday}T12:00:00.000Z`))
      / (24 * 60 * 60 * 1000)
    );
    if (daysUntilDue >= 1 && daysUntilDue <= 3) {
      const current = upcomingTasks.get(task.user_id) ?? [];
      current.push({
        title: task.title,
        dueLabel: formatDueLabel(dueDate, timezone),
      });
      upcomingTasks.set(task.user_id, current);
    }
  }

  for (const event of (events ?? []) as CalendarRow[]) {
    if (!event.user_id) continue;
    const user = usersById.get(event.user_id);
    if (!user) continue;

    const timezone = normalizeNotificationPreferences(user.notification_preferences).quiet_hours.timezone;
    const timeLabel = formatEventLabel(new Date(event.start_time), timezone);

    const isPlanBlock =
      event.is_ai_suggested === true ||
      event.source === 'schedule';

    if (isPlanBlock && !nextPlanBlock.has(event.user_id)) {
      nextPlanBlock.set(event.user_id, { title: event.title, timeLabel });
    }

    const current = upcomingEvents.get(event.user_id) ?? [];
    current.push({
      title: event.title,
      dueLabel: timeLabel,
    });
    upcomingEvents.set(event.user_id, current);
  }

  const pushCandidates: PushCandidate[] = [];
  const emailPromises: Promise<void>[] = [];

  for (const user of sweepUsers) {
    const prefs = user.notification_preferences;
    const normalizedPrefs = normalizeNotificationPreferences(prefs);
    const timezone = normalizedPrefs.quiet_hours.timezone;
    outcome.usersByTimezone.set(user.id, { timezone });
    const dedupeKey = getLocalDateKey(now, timezone);
    const morningTime = user.preferred_morning_time || DEFAULT_MORNING_TIME;
    const dueToday = tasksDueToday.get(user.id);
    const dueTodayCount = dueToday?.count ?? 0;
    const firstTask = dueToday?.titles[0] ?? 'your task';
    const planBlock = nextPlanBlock.get(user.id);
    const hasPlanReady = Boolean(planBlock);
    const notifyDailyPlan = hasPlanReady || dueTodayCount > 0;

    const welcomeDay = getWelcomeDay(user.created_at, now);
    if (
      welcomeDay &&
      user.email &&
      canSendNotification(prefs, 'email', 'account', { now, respectQuietHours: true }) &&
      !(await hasNotificationDelivery(supabase, user.id, 'welcome_series', 'email', `day-${welcomeDay}`))
    ) {
      emailPromises.push(
        sendWelcomeEmail(user.email, user.name || 'Pilot', welcomeDay, {
          idempotencyKey: buildEmailIdempotencyKey('welcome_series', 'email', user.id, `day-${welcomeDay}`),
        })
          .then((providerMessageId) => recordNotificationDelivery(
            supabase,
            user.id,
            'welcome_series',
            'email',
            `day-${welcomeDay}`,
            { provider: 'resend', provider_message_id: providerMessageId ?? null, day: welcomeDay }
          ))
          .then(() => {
            outcome.sent_welcome_emails += 1;
          })
          .catch((error) => {
            console.error(`[daily-sweep] Failed welcome email for ${user.email}:`, error);
          })
      );
    }

    if (
      notifyDailyPlan &&
      isPastLocalTime(now, timezone, morningTime) &&
      user.email &&
      canSendNotification(prefs, 'email', 'daily_plan', { now, respectQuietHours: true }) &&
      !(await hasNotificationDelivery(supabase, user.id, 'daily_plan', 'email', dedupeKey))
    ) {
      emailPromises.push(
        sendMorningPlanEmail(user.email, user.name || 'Pilot', dueTodayCount, {
          idempotencyKey: buildEmailIdempotencyKey('daily_plan', 'email', user.id, dedupeKey),
        })
          .then((providerMessageId) => recordNotificationDelivery(
            supabase,
            user.id,
            'daily_plan',
            'email',
            dedupeKey,
            { provider: 'resend', provider_message_id: providerMessageId ?? null, task_count: dueTodayCount }
          ))
          .then(() => {
            outcome.sent_morning_emails += 1;
          })
          .catch((error) => {
            console.error(`[daily-sweep] Failed morning plan email for ${user.email}:`, error);
          })
      );
    }

    if (
      dueTodayCount > 0 &&
      isPastLocalTime(now, timezone, DEFAULT_EVENING_TIME) &&
      user.email &&
      canSendNotification(prefs, 'email', 'deadline_rescue', { now, respectQuietHours: true }) &&
      !(await hasNotificationDelivery(supabase, user.id, 'deadline_rescue', 'email', dedupeKey))
    ) {
      emailPromises.push(
        sendDeadlineRescueEmail(user.email, user.name || 'Pilot', dueTodayCount, firstTask, {
          idempotencyKey: buildEmailIdempotencyKey('deadline_rescue', 'email', user.id, dedupeKey),
        })
          .then((providerMessageId) => recordNotificationDelivery(
            supabase,
            user.id,
            'deadline_rescue',
            'email',
            dedupeKey,
            {
              provider: 'resend',
              provider_message_id: providerMessageId ?? null,
              task_count: dueTodayCount,
              first_task: firstTask,
            }
          ))
          .then(() => {
            outcome.sent_deadline_emails += 1;
          })
          .catch((error) => {
            console.error(`[daily-sweep] Failed deadline rescue email for ${user.email}:`, error);
          })
      );
    }

    const taskItems = upcomingTasks.get(user.id) ?? [];
    const eventItems = upcomingEvents.get(user.id) ?? [];
    if (
      (taskItems.length > 0 || eventItems.length > 0) &&
      isPastLocalTime(now, timezone, morningTime) &&
      user.email &&
      canSendNotification(prefs, 'email', 'upcoming_reminders', { now, respectQuietHours: true }) &&
      !(await hasNotificationDelivery(supabase, user.id, 'upcoming_reminders', 'email', dedupeKey))
    ) {
      emailPromises.push(
        sendUpcomingRemindersEmail(user.email, user.name || 'Pilot', taskItems, eventItems, {
          idempotencyKey: buildEmailIdempotencyKey('upcoming_reminders', 'email', user.id, dedupeKey),
        })
          .then((providerMessageId) => recordNotificationDelivery(
            supabase,
            user.id,
            'upcoming_reminders',
            'email',
            dedupeKey,
            {
              provider: 'resend',
              provider_message_id: providerMessageId ?? null,
              task_count: taskItems.length,
              event_count: eventItems.length,
            }
          ))
          .then(() => {
            outcome.sent_upcoming_emails += 1;
          })
          .catch((error) => {
            console.error(`[daily-sweep] Failed upcoming reminders email for ${user.email}:`, error);
          })
      );
    }

    if (
      (taskItems.length > 0 || eventItems.length > 0) &&
      isPastLocalTime(now, timezone, morningTime) &&
      user.expo_push_token &&
      canSendNotification(prefs, 'push', 'upcoming_reminders', { now, respectQuietHours: true }) &&
      !(await hasNotificationDelivery(supabase, user.id, 'upcoming_reminders', 'push', dedupeKey))
    ) {
      const totalItems = taskItems.length + eventItems.length;
      pushCandidates.push({
        userId: user.id,
        token: user.expo_push_token,
        notificationType: 'upcoming_reminders',
        dedupeKey,
        title: 'Coming up soon',
        body: totalItems === 1
          ? 'Bruno spotted one thing on your horizon.'
          : `Bruno spotted ${totalItems} things on your horizon.`,
        data: { screen: 'tasks', source: 'upcoming' },
        metadata: { task_count: taskItems.length, event_count: eventItems.length },
      });
    }

    if (
      notifyDailyPlan &&
      isPastLocalTime(now, timezone, morningTime) &&
      user.expo_push_token &&
      canSendNotification(prefs, 'push', 'daily_plan', { now, respectQuietHours: true }) &&
      !(await hasNotificationDelivery(supabase, user.id, 'daily_plan', 'push', dedupeKey))
    ) {
      const pushBody = planBlock
        ? `First up: ${planBlock.title} at ${planBlock.timeLabel}.`
        : dueTodayCount > 0
          ? `${dueTodayCount} ${dueTodayCount === 1 ? 'thing' : 'things'} on your plate today. Tap to see your plan.`
          : 'Your day is ready. Tap to open your plan.';

      pushCandidates.push({
        userId: user.id,
        token: user.expo_push_token,
        notificationType: 'daily_plan',
        dedupeKey,
        title: 'Your daily plan is ready',
        body: pushBody,
        data: { screen: 'index', source: 'daily_plan' },
        metadata: { task_count: dueTodayCount, has_plan: hasPlanReady },
      });
    }

    if (
      dueTodayCount > 0 &&
      isPastLocalTime(now, timezone, DEFAULT_EVENING_TIME) &&
      user.expo_push_token &&
      canSendNotification(prefs, 'push', 'deadline_rescue', { now, respectQuietHours: true }) &&
      !(await hasNotificationDelivery(supabase, user.id, 'deadline_rescue', 'push', dedupeKey))
    ) {
      const body = dueTodayCount === 1
        ? `Hey ${user.name || 'Pilot'}! "${firstTask}" is due today. Want me to reschedule? Open Bruno Chat.`
        : `Hey ${user.name || 'Pilot'}! You have ${dueTodayCount} tasks due today including "${firstTask}". Let's knock them out!`;

      pushCandidates.push({
        userId: user.id,
        token: user.expo_push_token,
        notificationType: 'deadline_rescue',
        dedupeKey,
        title: 'Deadline Rescue',
        body,
        data: { screen: 'chat', source: 'deadline_rescue', prompt: 'Help me finish what is due today.' },
        metadata: { task_count: dueTodayCount, first_task: firstTask },
      });
    }
  }

  outcome.pushCandidates = pushCandidates;
  outcome.emailPromises = emailPromises;
  return outcome;
}
