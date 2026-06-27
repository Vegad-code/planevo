import type { SupabaseClient } from '@supabase/supabase-js';

import { buildEmailIdempotencyKey, sendWeeklyReviewEmail, type WeeklyReviewData } from '@/lib/email';
import type { Database } from '@/types/database';

import { forEachUserBatch } from '@/lib/cron/batch-users';
import {
  hasNotificationDelivery,
  recordNotificationDelivery,
} from './delivery';
import {
  canSendNotification,
  getLocalDateKey,
  type NotificationPreferences,
  normalizeNotificationPreferences,
} from './preferences';

type WeeklyReviewUser = {
  id: string;
  email: string;
  name: string | null;
  notification_preferences: Partial<NotificationPreferences> | null;
};

export type WeeklyReviewResult = {
  sent: number;
  failed: number;
  total: number;
};

export async function runWeeklyReviewSweep(
  supabase: SupabaseClient<Database>
): Promise<WeeklyReviewResult> {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let sent = 0;
  let failed = 0;
  const batchSize = 10;
  let total = 0;

  await forEachUserBatch<WeeklyReviewUser & { plan_type: string }>(
    supabase,
    'id, email, name, plan_type, notification_preferences ( master_toggle, channels, types, quiet_hours )',
    async (users) => {
      total += users.length;

      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async (user) => {
            try {
              const preferences = user.notification_preferences;
              if (!canSendNotification(preferences, 'email', 'weekly_review')) {
                return;
              }

              const timezone = normalizeNotificationPreferences(preferences).quiet_hours.timezone;
              const dedupeKey = getLocalDateKey(new Date(), timezone);
              if (await hasNotificationDelivery(supabase, user.id, 'weekly_review', 'email', dedupeKey)) {
                return;
              }

              const { data: completedTasks } = await supabase
                .from('tasks')
                .select('title, completed_at, priority, estimated_minutes')
                .eq('user_id', user.id)
                .eq('completed', true)
                .gte('completed_at', sevenDaysAgo.toISOString());

              const { data: focusSessions } = await supabase
                .from('focus_sessions')
                .select('duration_minutes, was_interrupted, created_at')
                .eq('user_id', user.id)
                .gte('created_at', sevenDaysAgo.toISOString());

              const { data: feedback } = await supabase
                .from('ai_feedback')
                .select('feature_name, action, created_at')
                .eq('user_id', user.id)
                .gte('created_at', sevenDaysAgo.toISOString());

              if ((!completedTasks || completedTasks.length === 0) && (!focusSessions || focusSessions.length === 0)) {
                return;
              }

              const prompt = `You are Bruno, a friendly bear AI assistant. Generate a weekly review for ${user.name || 'the user'}.

COMPLETED TASKS (${completedTasks?.length || 0}):
${JSON.stringify(completedTasks?.map((task) => ({ title: task.title, priority: task.priority, minutes: task.estimated_minutes })) || [])}

FOCUS SESSIONS (${focusSessions?.length || 0}):
${JSON.stringify(focusSessions?.map((session) => ({ minutes: session.duration_minutes, interrupted: session.was_interrupted })) || [])}

FEEDBACK (${feedback?.length || 0}):
${JSON.stringify(feedback?.map((item) => ({ feature: item.feature_name, action: item.action })) || [])}

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
                  Authorization: `Bearer ${openAiApiKey}`,
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

              const providerMessageId = await sendWeeklyReviewEmail(user.email, user.name || 'Pilot', review, {
                idempotencyKey: buildEmailIdempotencyKey('weekly_review', 'email', user.id, dedupeKey),
              });
              await recordNotificationDelivery(
                supabase,
                user.id,
                'weekly_review',
                'email',
                dedupeKey,
                { provider: 'resend', provider_message_id: providerMessageId ?? null }
              );
              sent += 1;
            } catch (error) {
              console.error(`[weekly-review] Failed for user ${user.id}:`, error);
              failed += 1;
            }
          })
        );
      }
    },
    {
      filter: (query) =>
        query.in('plan_type', ['trialing', 'premium', 'admin', 'student']),
    }
  );

  return { sent, failed, total };
}
