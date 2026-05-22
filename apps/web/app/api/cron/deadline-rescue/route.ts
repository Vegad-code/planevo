import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cron/deadline-rescue
 *
 * Vercel Cron job — runs daily at 1 AM UTC (6 PM PT).
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Find tasks due today that are still incomplete
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const { data: overdueTasks, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id, title, user_id,
        users!inner ( expo_push_token, push_notifications_enabled, name )
      `)
      .in('status', ['todo', 'in_progress'])
      .is('deleted_at', null)
      .gte('due_date', todayStart.toISOString())
      .lte('due_date', todayEnd.toISOString());

    if (taskError) throw taskError;
    if (!overdueTasks || overdueTasks.length === 0) {
      return NextResponse.json({ message: 'No overdue tasks found', sent: 0 });
    }

    // Group tasks by user and collect push tokens
    const userTasks = new Map<string, { token: string; name: string; tasks: string[] }>();

    for (const task of overdueTasks) {
      const user = (task as any).users;
      if (!user?.expo_push_token || !user?.push_notifications_enabled) continue;

      if (!userTasks.has(task.user_id)) {
        userTasks.set(task.user_id, {
          token: user.expo_push_token,
          name: user.name || 'Pilot',
          tasks: [],
        });
      }
      userTasks.get(task.user_id)!.tasks.push(task.title);
    }

    // Send push notifications via Expo
    const messages = Array.from(userTasks.entries()).map(([_userId, data]) => {
      const taskCount = data.tasks.length;
      const firstTask = data.tasks[0];
      const body = taskCount === 1
        ? `Hey ${data.name}! "${firstTask}" is due today. Want me to reschedule? Open Bruno Chat. 🐻`
        : `Hey ${data.name}! You have ${taskCount} tasks due today including "${firstTask}". Let's knock them out! 🐻`;

      return {
        to: data.token,
        sound: 'default' as const,
        title: '🐻 Deadline Rescue',
        body,
        data: { screen: 'chat' },
      };
    });

    let sent = 0;
    if (messages.length > 0) {
      // Expo Push API accepts batches of up to 100
      const batchSize = 100;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          console.error('[deadline-rescue] Expo Push API error:', await response.text());
        } else {
          sent += batch.length;
        }
      }
    }

    return NextResponse.json({
      message: `Sent ${sent} deadline rescue notifications`,
      sent,
      total_overdue_tasks: overdueTasks.length,
    });
  } catch (error) {
    console.error('[cron/deadline-rescue] Fatal error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
