import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWeeklyReviewEmail, type WeeklyReviewData } from '@/lib/email';
import {
  canSendNotification,
  getLocalDateKey,
  normalizeNotificationPreferences,
} from '@/lib/notifications/preferences';
import {
  hasNotificationDelivery,
  recordNotificationDelivery,
} from '@/lib/notifications/delivery';

/**
 * GET /api/cron/weekly-review
 *
 * Vercel Cron job — runs every Sunday at 4 PM UTC (9 AM PT).
 * Generates a weekly review for each active user and sends it via email.
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  // Use the service role client to iterate over all users
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Fetch active paying users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, plan_type, notification_preferences ( master_toggle, channels, types, quiet_hours )')
      .in('plan_type', ['trialing', 'premium', 'admin', 'student']);

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No active users found', sent: 0 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let sent = 0;
    let failed = 0;

    // Process users in batches of 10
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (user) => {
          try {
            const preferences = (user as any).notification_preferences;
            if (!canSendNotification(preferences, 'email', 'weekly_review')) {
              return;
            }
            const timezone = normalizeNotificationPreferences(preferences).quiet_hours.timezone;
            const dedupeKey = getLocalDateKey(new Date(), timezone);
            if (await hasNotificationDelivery(supabase, user.id, 'weekly_review', 'email', dedupeKey)) {
              return;
            }

            // Fetch completed tasks
            const { data: completedTasks } = await supabase
              .from('tasks')
              .select('title, completed_at, priority, estimated_minutes')
              .eq('user_id', user.id)
              .eq('completed', true)
              .gte('completed_at', sevenDaysAgo.toISOString());

            // Fetch focus sessions
            const { data: focusSessions } = await supabase
              .from('focus_sessions')
              .select('duration_minutes, was_interrupted, created_at')
              .eq('user_id', user.id)
              .gte('created_at', sevenDaysAgo.toISOString());

            // Fetch feedback
            const { data: feedback } = await supabase
              .from('ai_feedback')
              .select('feature_name, action, created_at')
              .eq('user_id', user.id)
              .gte('created_at', sevenDaysAgo.toISOString());

            // Skip users with no activity — avoid spammy empty reviews
            if ((!completedTasks || completedTasks.length === 0) && (!focusSessions || focusSessions.length === 0)) {
              console.log(`[cron/weekly-review] Skipping user ${user.id} — no activity this week.`);
              return;
            }

            // Generate review via OpenAI
            const prompt = `You are Bruno, a friendly bear AI assistant. Generate a weekly review for ${user.name || 'the user'}.

COMPLETED TASKS (${completedTasks?.length || 0}):
${JSON.stringify(completedTasks?.map(t => ({ title: t.title, priority: t.priority, minutes: t.estimated_minutes })) || [])}

FOCUS SESSIONS (${focusSessions?.length || 0}):
${JSON.stringify(focusSessions?.map(s => ({ minutes: s.duration_minutes, interrupted: s.was_interrupted })) || [])}

FEEDBACK (${feedback?.length || 0}):
${JSON.stringify(feedback?.map(f => ({ feature: f.feature_name, action: f.action })) || [])}

Generate a weekly review JSON with:
1. "headline" — A catchy 3-5 word title
2. "summary" — 2-3 sentences summarizing the week
3. "insights" — Array of 2-3 specific observations
4. "suggestion" — One actionable suggestion
5. "vibe" — One word (e.g., "Grinding", "Flowing", "Building")
6. "stats" — Object with: tasks_completed (number), total_focus_minutes (number), feedback_given (number)

Respond ONLY with JSON.`;

            const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiApiKey}`,
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages: [{ role: 'system', content: prompt }],
                max_tokens: 500,
              }),
            });

            if (!aiResponse.ok) {
              throw new Error(`OpenAI API error: ${aiResponse.status}`);
            }

            const aiData = await aiResponse.json();
            const review: WeeklyReviewData = JSON.parse(aiData.choices[0].message.content);

            // Send the email
            await sendWeeklyReviewEmail(user.email, user.name || 'Pilot', review);
            await recordNotificationDelivery(
              supabase,
              user.id,
              'weekly_review',
              'email',
              dedupeKey
            );
            sent++;
          } catch (err) {
            console.error(`[cron/weekly-review] Failed for user ${user.id}:`, err);
            failed++;
          }
        })
      );
    }

    return NextResponse.json({
      message: `Weekly review sent to ${sent} users, ${failed} failed`,
      sent,
      failed,
      total: users.length,
    });
  } catch (error) {
    console.error('[cron/weekly-review] Fatal error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
