import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { buildEmailIdempotencyKey, sendMorningPlanEmail } from '@/lib/email';
import {
  canSendNotification,
  getLocalDateKey,
  isLocalTimeWithinWindow,
  normalizeNotificationPreferences,
} from '@/lib/notifications/preferences';
import {
  hasNotificationDelivery,
  recordNotificationDelivery,
} from '@/lib/notifications/delivery';
import { Database } from '@/types/database';

type PushUser = {
  id: string;
  name: string | null;
  email: string;
  expo_push_token: string | null;
  preferred_morning_time: string | null;
  notification_preferences: {
    master_toggle: boolean;
    channels: { push: boolean; email: boolean };
    quiet_hours: { enabled: boolean; start: string; end: string; timezone: string };
    types: Record<string, boolean>;
  } | null;
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

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function sendMorningPushes(request: NextRequest) {
  if (!isAuthorized(request)) {
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

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      id, name, email, expo_push_token, preferred_morning_time,
      notification_preferences ( master_toggle, channels, types, quiet_hours )
    `);

  if (usersError) {
    console.error('[notifications/push] Failed to fetch users:', usersError);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  const pushUsers = (users ?? []) as unknown as PushUser[];
  if (pushUsers.length === 0) {
    return NextResponse.json({ message: 'No push-enabled users found', sent: 0 });
  }

  const { start, end } = todayBounds();
  const queryStart = new Date(new Date(start).getTime() - 24 * 60 * 60 * 1000).toISOString();
  const queryEnd = new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const taskCounts = new Map<string, number>();
  const usersById = new Map(pushUsers.map((user) => [user.id, user]));

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('user_id, due_date')
    .in('user_id', pushUsers.map((user) => user.id))
    .in('status', ['todo', 'in_progress'])
    .is('deleted_at', null)
    .gte('due_date', queryStart)
    .lte('due_date', queryEnd);

  if (tasksError) {
    console.error('[notifications/push] Failed to fetch tasks:', tasksError);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }

  for (const task of tasks ?? []) {
    if (!task.due_date) continue;
    const userId = task.user_id;
    const user = usersById.get(userId);
    if (!user) continue;
    const timezone = normalizeNotificationPreferences(user.notification_preferences).quiet_hours.timezone;
    if (getLocalDateKey(new Date(task.due_date), timezone) !== getLocalDateKey(new Date(), timezone)) {
      continue;
    }
    taskCounts.set(userId, (taskCounts.get(userId) ?? 0) + 1);
  }

  const messages: ExpoPushMessage[] = [];
  const emailPromises: Promise<void>[] = [];
  let sentEmails = 0;
  const now = new Date();

  // Keep track of which push corresponds to which user to clean up invalid tokens
  const messageDeliveries: Array<{ userId: string; dedupeKey: string }> = [];

  for (const user of pushUsers) {
    const normalizedPrefs = normalizeNotificationPreferences(user.notification_preferences);
    const timezone = normalizedPrefs.quiet_hours.timezone;
    const morningTime = user.preferred_morning_time || '09:00';
    if (!isLocalTimeWithinWindow(now, timezone, morningTime)) continue;

    const count = taskCounts.get(user.id) ?? 0;
    if (count === 0) continue;

    const prefs = user.notification_preferences;
    const dedupeKey = getLocalDateKey(now, timezone);
    const canSendPush = canSendNotification(prefs, 'push', 'daily_plan', {
      now,
      respectQuietHours: true,
    });
    const canSendEmail = canSendNotification(prefs, 'email', 'daily_plan', {
      now,
      respectQuietHours: true,
    });

    if (
      canSendPush &&
      user.expo_push_token &&
      !(await hasNotificationDelivery(supabase, user.id, 'daily_plan', 'push', dedupeKey))
    ) {
      messages.push({
        to: user.expo_push_token,
        sound: 'default',
        title: 'Your daily plan is ready',
        body: `${count} ${count === 1 ? 'thing' : 'things'} on your plate today. Tap to see your plan.`,
        data: { screen: 'index' },
      });
      messageDeliveries.push({ userId: user.id, dedupeKey });
    }

    if (
      canSendEmail &&
      user.email &&
      !(await hasNotificationDelivery(supabase, user.id, 'daily_plan', 'email', dedupeKey))
    ) {
      emailPromises.push(
        sendMorningPlanEmail(user.email, user.name || 'Pilot', count, {
          idempotencyKey: buildEmailIdempotencyKey('daily_plan', 'email', user.id, dedupeKey),
        })
          .then((providerMessageId) => recordNotificationDelivery(
            supabase,
            user.id,
            'daily_plan',
            'email',
            dedupeKey,
            { provider: 'resend', provider_message_id: providerMessageId ?? null, task_count: count }
          ))
          .then(() => {
            sentEmails++;
          })
          .catch((e) => {
            console.error(`Failed to send morning plan email to ${user.email}`, e);
          })
      );
    }
  }

  let sentPush = 0;
  let failedPush = 0;

  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const batchDeliveries = messageDeliveries.slice(i, i + 100);

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        const result = await response.json() as ExpoPushResponse;
        // Check for DeviceNotRegistered errors
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
                  'daily_plan',
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

        // Cleanup stale tokens
        if (invalidTokens.length > 0) {
          await supabase
            .from('users')
            .update({ expo_push_token: null })
            .in('id', invalidTokens);
          console.log(`[notifications/push] Cleaned up ${invalidTokens.length} stale tokens.`);
        }
      } else {
        failedPush += batch.length;
        console.error('[notifications/push] Expo Push API error:', await response.text());
      }
    } catch (err) {
      failedPush += batch.length;
      console.error('[notifications/push] Request failed:', err);
    }
  }

  await Promise.all(emailPromises);

  return NextResponse.json({
    message: `Sent ${sentPush} morning push notifications, and ${sentEmails} emails`,
    sent_push: sentPush,
    failed_push: failedPush,
    sent_emails: sentEmails,
    total_users_targeted: pushUsers.length,
  });
}

export async function GET(request: NextRequest) {
  return sendMorningPushes(request);
}

export async function POST(request: NextRequest) {
  return sendMorningPushes(request);
}
