import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { findGaps } from '@/lib/calendar';
import { getBrunoMasterContext } from '@/lib/ai/orchestrator';
import { getUserAIMemory } from '@/lib/ai/memory';
import { resolveProposalColor } from '@/lib/bruno/proposalColors';
import { posthogServer } from '@/lib/posthog-server';
import { inferEnergyLevel } from '@/lib/plan/infer-energy';
import { getDayBounds, hasLockedPlanToday } from '@/lib/plan/day-plan';
import type { Tables } from '@/types/database';

export type PlanTrigger = 'cron' | 'manual' | 'reshuffle';

export interface GenerateDailyPlanInput {
  userId: string;
  timezone?: string;
  localTime?: string;
  todayStart?: string;
  todayEnd?: string;
  energyLevel?: 'low' | 'medium' | 'high';
  force?: boolean;
  trigger?: PlanTrigger;
}

export interface GeneratedPlanItem {
  id?: string;
  title: string;
  reason?: string;
  suggested_start: string;
  suggested_end: string;
}

export interface GenerateDailyPlanResult {
  ok: boolean;
  skipped?: boolean;
  skipReason?: string;
  plan: GeneratedPlanItem[];
  overflow: number;
  summary: string;
  message: string;
  energyLevel: 'low' | 'medium' | 'high';
  focusScore?: number;
  vibe?: string;
}

const scheduleItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(500),
  reason: z.string().optional(),
  suggested_start: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid start'),
  suggested_end: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid end'),
}).refine((item) => new Date(item.suggested_end) > new Date(item.suggested_start), {
  message: 'suggested_end must be after suggested_start',
});

const aiResponseSchema = z.object({
  schedule_name: z.string().optional(),
  focus_score: z.number().optional(),
  vibe: z.string().optional(),
  schedule: z.array(scheduleItemSchema).optional(),
  plan: z.array(scheduleItemSchema).optional(),
  message: z.string().optional(),
});

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function generateDailyPlan(
  input: GenerateDailyPlanInput
): Promise<GenerateDailyPlanResult> {
  const {
    userId,
    timezone,
    localTime,
    todayStart,
    todayEnd,
    force = false,
    trigger = 'manual',
  } = input;

  const now = localTime ? new Date(localTime) : new Date();
  const { dayStart, dayEnd, localHour } = getDayBounds(now, timezone);

  const resolvedDayStart = todayStart ? new Date(todayStart) : dayStart;
  const resolvedDayEnd = todayEnd ? new Date(todayEnd) : dayEnd;

  const { data: existingRows } = await supabaseAdmin
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .neq('status', 'rejected')
    .gte('start_time', resolvedDayStart.toISOString())
    .lte('start_time', resolvedDayEnd.toISOString());

  if (!force && hasLockedPlanToday((existingRows ?? []) as Tables<'calendar_events'>[])) {
    return {
      ok: true,
      skipped: true,
      skipReason: 'plan_already_locked',
      plan: [],
      overflow: 0,
      summary: 'Your plan for today is already set.',
      message: 'Your plan for today is already set.',
      energyLevel: input.energyLevel ?? 'medium',
    };
  }

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('energy_preference')
    .eq('id', userId)
    .single();

  const memory = await getUserAIMemory(supabaseAdmin, userId);
  const energyLevel =
    input.energyLevel ??
    inferEnergyLevel(userRow?.energy_preference, localHour, memory);

  const worldState = await getBrunoMasterContext(userId, energyLevel);

  if (worldState.tasks.length === 0) {
    return {
      ok: true,
      plan: [],
      overflow: 0,
      summary: 'Nothing to schedule today.',
      message: 'No tasks to plan! Add something new?',
      energyLevel,
    };
  }

  const constraints =
    (worldState.memory.avoided_focus_windows as { start: string; end: string }[])?.map((w) => ({
      start: new Date(w.start),
      end: new Date(w.end),
    })) ?? [];

  const gaps = findGaps(worldState.calendarEvents, now, new Date(resolvedDayEnd), constraints);

  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    return {
      ok: true,
      plan: worldState.tasks.slice(0, 1).map((t) => ({
        id: t.id,
        title: t.title,
        suggested_start: now.toISOString(),
        suggested_end: new Date(now.getTime() + 60 * 60_000).toISOString(),
      })),
      overflow: Math.max(0, worldState.tasks.length - 1),
      summary: 'Bruno is warming up — here is your top priority.',
      message: "Bruno is warming up... here's your top priority!",
      energyLevel,
    };
  }

  const prompt = `You are Bruno, a friendly planning assistant for students. You are preparing a "Daily Plan" for the user.

User Energy Level (inferred): ${energyLevel}
User Local Time: ${now.toLocaleTimeString()} (${timezone || 'UTC'})
Schedule Range: ${resolvedDayStart.toISOString()} to ${resolvedDayEnd.toISOString()}
Available Calendar Gaps: ${JSON.stringify(gaps)}

User AI Memory:
${worldState.memoryContext}

Tasks:
${JSON.stringify(
  worldState.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    estimated_minutes: t.estimated_minutes,
    energy_level_required: (t as { energy_level_required?: string }).energy_level_required || 'medium',
    priority: t.priority,
    due_at: (t as { due_at?: string }).due_at || null,
    is_assignment: (t as { is_assignment?: boolean }).is_assignment || false,
  }))
)}

Rules:
- Suggest 1-3 tasks to work on TODAY.
- PRIORITY 1: Tasks or assignments due TODAY.
- PRIORITY 2: Tasks or assignments due SOON (next 2-7 days). If the user has a light load today, schedule 1-2 upcoming items to help them get ahead.
- Match tasks to available gaps and energy level.
- Apply User AI Memory, especially preferred focus times, break preference, detail level, and disliked patterns.
- For each task, provide "suggested_start" and "suggested_end" in ISO format within one of the provided gaps.
- Each block needs a clear "reason" explaining why this slot was chosen (deadline, focus window, gap before meeting, etc.).

Respond ONLY with JSON:
{
  "schedule_name": "...",
  "focus_score": 85,
  "vibe": "...",
  "schedule": [
    {
      "id": "task_id",
      "title": "Task Title",
      "reason": "Strategic rationale",
      "suggested_start": "YYYY-MM-DDTHH:MM:SSZ",
      "suggested_end": "YYYY-MM-DDTHH:MM:SSZ"
    }
  ],
  "message": "A warm, helpful one-sentence summary from Bruno"
}

IMPORTANT: suggested_start and suggested_end MUST be within the provided gaps and in the FUTURE (after ${now.toISOString()}).`;

  const aiApiResponse = await Sentry.startSpan(
    { name: 'OpenAI Daily Plan completion', op: 'ai.completion' },
    async () =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: prompt }],
        }),
      })
  );

  if (!aiApiResponse.ok) {
    throw new Error('AI API failure');
  }

  const rawData = await aiApiResponse.json();
  let aiResponse: unknown;
  try {
    aiResponse = JSON.parse(rawData.choices[0].message.content);
  } catch {
    throw new Error('AI returned invalid JSON');
  }

  const aiParsed = aiResponseSchema.safeParse(aiResponse);
  let plan: GeneratedPlanItem[];

  if (aiParsed.success) {
    plan = aiParsed.data.schedule ?? aiParsed.data.plan ?? [];
  } else {
    const raw = aiResponse as { schedule?: GeneratedPlanItem[]; plan?: GeneratedPlanItem[] };
    const rawPlan = raw.schedule ?? raw.plan ?? [];
    plan = rawPlan.filter((item) => {
      try {
        const start = new Date(item.suggested_start);
        const end = new Date(item.suggested_end);
        return item.title && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
      } catch {
        return false;
      }
    });
  }

  const parsedMessage =
    aiParsed.success && aiParsed.data.message
      ? aiParsed.data.message
      : 'Your day is ready.';

  const scheduledTaskIds = new Set(
    plan.map((item) => item.id).filter((id): id is string => Boolean(id))
  );
  const overflow = worldState.tasks.filter((t) => !scheduledTaskIds.has(t.id)).length;

  if (plan.length > 0) {
    const ghostBlocks = plan.map((item, index) => {
      let startTime: string;
      let endTime: string;
      try {
        startTime = new Date(item.suggested_start).toISOString();
        endTime = new Date(item.suggested_end).toISOString();
      } catch {
        startTime = now.toISOString();
        endTime = new Date(now.getTime() + 60 * 60_000).toISOString();
      }

      const taskId = item.id && isUuid(item.id) ? item.id : null;
      const canvasId = item.id && !isUuid(item.id) ? item.id : null;
      const blockColor = resolveProposalColor({
        title: item.title,
        description: item.reason,
        batchIndex: index,
      });

      return {
        user_id: userId,
        title: item.title,
        start_time: startTime,
        end_time: endTime,
        linked_task_id: taskId,
        external_id: null,
        source: 'schedule',
        color: blockColor,
        energy_level: energyLevel,
        is_ai_suggested: true,
        status: 'pending',
        metadata: {
          canvas_id: canvasId,
          reason: item.reason,
          generated_by: trigger,
        },
      };
    });

    await supabaseAdmin
      .from('calendar_events')
      .delete()
      .eq('user_id', userId)
      .eq('is_ai_suggested', true)
      .eq('status', 'pending')
      .gte('start_time', resolvedDayStart.toISOString())
      .lte('start_time', resolvedDayEnd.toISOString());

    const { error: insertError } = await supabaseAdmin.from('calendar_events').insert(ghostBlocks);
    if (insertError) {
      console.error('[generateDailyPlan] Failed to insert ghost blocks:', insertError);
      throw new Error('Failed to save plan blocks');
    }
  }

  posthogServer.capture({
    distinctId: userId,
    event: 'plan_generated',
    properties: {
      task_count: worldState.tasks.length,
      plan_size: plan.length,
      energy_level: energyLevel,
      trigger,
      overflow,
    },
  });

  const summary =
    plan.length > 0
      ? `Bruno scheduled ${plan.length} block${plan.length === 1 ? '' : 's'} for today.`
      : 'Nothing fit in today\'s open slots.';

  return {
    ok: true,
    plan,
    overflow,
    summary,
    message: parsedMessage,
    energyLevel,
    focusScore: aiParsed.success ? aiParsed.data.focus_score : undefined,
    vibe: aiParsed.success ? aiParsed.data.vibe : undefined,
  };
}
