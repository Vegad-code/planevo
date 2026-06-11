import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildEmailIdempotencyKey, sendDeadlineRescueEmail } from '@/lib/email';
import {
  canSendNotification,
  getLocalDateKey,
  isLocalTimeWithinWindow,
  type NotificationPreferences,
  normalizeNotificationPreferences,
} from '@/lib/notifications/preferences';
import {
  hasNotificationDelivery,
  recordNotificationDelivery,
} from '@/lib/notifications/delivery';
import { Database } from '@/types/database';

type DeadlineTaskUser = {
  email: string | null;
  expo_push_token: string | null;
  name: string | null;
  notification_preferences: Partial<NotificationPreferences> | null;
};

type DeadlineTaskRow = {
  title: string;
  user_id: string;
  due_date: string | null;
  users: DeadlineTaskUser | DeadlineTaskUser[];
};

type ExpoPushMessage = {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: { screen: string };
};

type ExpoPushTicket =
  | { status: 'ok'; id?: string }
  | { status: 'error'; message?: string; details?: { error?: string } };

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
};

function getTaskUser(task: DeadlineTaskRow) {
  return Array.isArray(task.users) ? task.users[0] : task.users;
}

/**
 * GET /api/cron/deadline-rescue
 *
 * Vercel Cron job - runs daily at 1 AM UTC (6 PM PT).
 * Finds tasks due today that are still incomplete and sends
 * a push notification to the user via Expo Push API.
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);
    const queryStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const queryEnd = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

    const { data: overdueTasks, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id, title, user_id, due_date,
        users!inner ( email, expo_push_token, name, notification_preferences ( master_toggle, channels, types, quiet_hours ) )
      `)
      .in('status', ['todo', 'in_progress'])
      .is('deleted_at', null)
      .gte('due_date', queryStart.toISOString())
      .lte('due_date', queryEnd.toISOString());

    if (taskError) throw taskError;
    if (!overdueTasks || overdueTasks.length === 0) {
      return NextResponse.json({ message: 'No overdue tasks found', sent: 0 });
    }

    const userTasks = new Map<string, {
      token: string | null;
      email: string | null;
      name: string;
      tasks: string[];
      prefs: Partial<NotificationPreferences> | null;
    }>();

    for (const task of overdueTasks as unknown as DeadlineTaskRow[]) {
      if (!task.due_date) continue;
      const user = getTaskUser(task);
      if (!user) continue;

      const prefs = user.notification_preferences;
      const timezone = normalizeNotificationPreferences(prefs).quiet_hours.timezone;
      const now = new Date();
      if (!isLocalTimeWithinWindow(now, timezone, '18:00')) continue;
      if (getLocalDateKey(new Date(task.due_date), timezone) !== getLocalDateKey(now, timezone)) {
        continue;
      }

      if (!userTasks.has(task.user_id)) {
        userTasks.set(task.user_id, {
          token: user.expo_push_token,
          email: user.email,
          name: user.name || 'Pilot',
          tasks: [],
          prefs,
        });
      }
      userTasks.get(task.user_id)!.tasks.push(task.title);
    }

    const messages: ExpoPushMessage[] = [];
    const emailPromises: Promise<void>[] = [];
    let sentEmails = 0;
    const messageDeliveries: Array<{ userId: string; dedupeKey: string }> = [];
    const now = new Date();

    for (const [userId, data] of Array.from(userTasks.entries())) {
      const taskCount = data.tasks.length;
      const firstTask = data.tasks[0];
      const timezone = normalizeNotificationPreferences(data.prefs).quiet_hours.timezone;
      const dedupeKey = getLocalDateKey(now, timezone);

      if (
        data.token &&
        canSendNotification(data.prefs, 'push', 'deadline_rescue', {
          now,
          respectQuietHours: true,
        }) &&
        !(await hasNotificationDelivery(supabase, userId, 'deadline_rescue', 'push', dedupeKey))
      ) {
        const body = taskCount === 1
          ? `Hey ${data.name}! "${firstTask}" is due today. Want me to reschedule? Open Bruno Chat.`
          : `Hey ${data.name}! You have ${taskCount} tasks due today including "${firstTask}". Let's knock them out!`;

        messages.push({
          to: data.token,
          sound: 'default',
          title: 'Deadline Rescue',
          body,
          data: { screen: 'chat' },
        });
        messageDeliveries.push({ userId, dedupeKey });
      }

      if (
        data.email &&
        canSendNotification(data.prefs, 'email', 'deadline_rescue', {
          now,
          respectQuietHours: true,
        }) &&
        !(await hasNotificationDelivery(supabase, userId, 'deadline_rescue', 'email', dedupeKey))
      ) {
        emailPromises.push(
          sendDeadlineRescueEmail(data.email, data.name, taskCount, firstTask, {
            idempotencyKey: buildEmailIdempotencyKey('deadline_rescue', 'email', userId, dedupeKey),
          })
            .then((providerMessageId) => recordNotificationDelivery(
              supabase,
              userId,
              'deadline_rescue',
              'email',
              dedupeKey,
              {
                provider: 'resend',
                provider_message_id: providerMessageId ?? null,
                task_count: taskCount,
                first_task: firstTask,
              }
            ))
            .then(() => {
              sentEmails++;
            })
            .catch((e) => {
              console.error(`Failed to send deadline rescue email to ${data.email}`, e);
            })
        );
      }
    }

    let sentPush = 0;
    let failedPush = 0;

    if (messages.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchDeliveries = messageDeliveries.slice(i, i + batchSize);

        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch),
          });

          if (!response.ok) {
            failedPush += batch.length;
            console.error('[deadline-rescue] Expo Push API error:', await response.text());
          } else {
            const result = await response.json() as ExpoPushResponse;
            const invalidTokens: string[] = [];

            if (result.data) {
              for (let idx = 0; idx < result.data.length; idx++) {
                const receipt = result.data[idx];
                if (receipt.status === 'ok') {
                  sentPush++;
                  const delivery = batchDeliveries[idx];
                  if (delivery) {
                    await recordNotificationDelivery(
                      supabase,
                      delivery.userId,
                      'deadline_rescue',
                      'push',
                      delivery.dedupeKey,
                      { provider: 'expo', ticket_id: receipt.id ?? null }
                    );
                  }
                } else if (receipt.status === 'error') {
                  failedPush++;
                  if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
                    const userId = batchDeliveries[idx]?.userId;
                    if (userId) invalidTokens.push(userId);
                  }
                }
              }
            }

            if (invalidTokens.length > 0) {
              await supabase
                .from('users')
                .update({ expo_push_token: null })
                .in('id', invalidTokens);
              console.log(`[deadline-rescue] Cleaned up ${invalidTokens.length} stale tokens.`);
            }
          }
        } catch (err) {
          failedPush += batch.length;
          console.error('[deadline-rescue] Request failed:', err);
        }
      }
    }

    await Promise.all(emailPromises);

    return NextResponse.json({
      message: `Sent ${sentPush} deadline rescue notifications, and ${sentEmails} emails`,
      sent_push: sentPush,
      failed_push: failedPush,
      sent_emails: sentEmails,
      total_overdue_tasks: overdueTasks.length,
    });
  } catch (error) {
    console.error('[cron/deadline-rescue] Fatal error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
