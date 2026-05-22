import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type PushUser = {
  id: string;
  name: string | null;
  expo_push_token: string | null;
  preferred_morning_time: string | null;
};

const ACTIVE_PLAN_TYPES = ['pro_monthly', 'pro_annual', 'trialing', 'premium', 'admin', 'student'];

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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, expo_push_token, preferred_morning_time')
    .eq('push_notifications_enabled', true)
    .not('expo_push_token', 'is', null)
    .in('plan_type', ACTIVE_PLAN_TYPES);

  if (usersError) {
    console.error('[notifications/push] Failed to fetch users:', usersError);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }

  const pushUsers = (users ?? []) as PushUser[];
  if (pushUsers.length === 0) {
    return NextResponse.json({ message: 'No push-enabled users found', sent: 0 });
  }

  const { start, end } = todayBounds();
  const taskCounts = new Map<string, number>();

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('user_id')
    .in('user_id', pushUsers.map((user) => user.id))
    .in('status', ['todo', 'in_progress'])
    .is('deleted_at', null)
    .gte('due_date', start)
    .lte('due_date', end);

  if (tasksError) {
    console.error('[notifications/push] Failed to fetch tasks:', tasksError);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }

  for (const task of tasks ?? []) {
    const userId = (task as { user_id: string }).user_id;
    taskCounts.set(userId, (taskCounts.get(userId) ?? 0) + 1);
  }

  const messages = pushUsers
    .map((user) => {
      const count = taskCounts.get(user.id) ?? 0;
      if (!user.expo_push_token || count === 0) return null;

      return {
        to: user.expo_push_token,
        sound: 'default',
        title: 'Your daily plan is ready',
        body: `${count} ${count === 1 ? 'thing' : 'things'} on your plate today. Tap to see your plan.`,
        data: { screen: 'index' },
      };
    })
    .filter(Boolean);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });

    if (response.ok) {
      sent += batch.length;
    } else {
      failed += batch.length;
      console.error('[notifications/push] Expo Push API error:', await response.text());
    }
  }

  return NextResponse.json({
    message: `Sent ${sent} morning push notifications`,
    sent,
    failed,
    total_push_users: pushUsers.length,
  });
}

export async function GET(request: NextRequest) {
  return sendMorningPushes(request);
}

export async function POST(request: NextRequest) {
  return sendMorningPushes(request);
}
