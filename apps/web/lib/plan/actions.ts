'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { generateDailyPlan } from '@/lib/ai/generate-daily-plan';
import { recordScheduleBlockFeedbackInMemory } from '@/lib/ai/memory';
import type { Json } from '@/types/database';
import { z } from 'zod';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function revalidatePlanSurfaces() {
  revalidatePath('/dashboard/daily-plan');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/calendar');
  revalidatePath('/dashboard/tasks');
}

const blockFeedbackSchema = z.object({
  blockId: z.string().uuid(),
  action: z.enum(['accept', 'too_vague', 'too_many_breaks', 'wrong_time']),
});

export async function acceptDailyPlanAction(): Promise<ActionResult<{ accepted: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const { data: pendingBlocks, error: fetchError } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_ai_suggested', true)
    .eq('status', 'pending')
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString());

  if (fetchError) {
    return { success: false, error: 'Failed to load pending blocks' };
  }

  if (!pendingBlocks?.length) {
    return { success: true, data: { accepted: 0 } };
  }

  const { error: updateError } = await supabase
    .from('calendar_events')
    .update({ status: 'accepted' })
    .eq('user_id', user.id)
    .eq('is_ai_suggested', true)
    .eq('status', 'pending')
    .gte('start_time', dayStart.toISOString())
    .lte('start_time', dayEnd.toISOString());

  if (updateError) {
    return { success: false, error: 'Failed to accept plan' };
  }

  revalidatePlanSurfaces();

  return { success: true, data: { accepted: pendingBlocks.length } };
}

export async function blockFeedbackAction(
  input: unknown
): Promise<ActionResult> {
  const parsed = blockFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Invalid feedback' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { blockId, action } = parsed.data;

  const { data: block, error: blockError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', blockId)
    .eq('user_id', user.id)
    .single();

  if (blockError || !block) {
    return { success: false, error: 'Block not found' };
  }

  const newStatus = action === 'accept' ? 'accepted' : 'rejected';

  const { error: updateError } = await supabase
    .from('calendar_events')
    .update({ status: newStatus })
    .eq('id', blockId)
    .eq('user_id', user.id);

  if (updateError) {
    return { success: false, error: 'Failed to update block' };
  }

  await supabase.from('ai_feedback').insert({
    user_id: user.id,
    feature_name: 'daily_plan_block',
    action,
    suggestion_json: block as unknown as Json,
  });

  const duration = block.end_time && block.start_time
    ? Math.round(
        (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / 60_000
      )
    : 30;

  try {
    await recordScheduleBlockFeedbackInMemory(supabase, user.id, action, {
      type: block.energy_level === 'low' ? 'break' : 'focus',
      duration,
      title: block.title,
    });
  } catch (err) {
    console.error('[blockFeedbackAction] Memory update failed:', err);
  }

  revalidatePlanSurfaces();

  return { success: true, data: undefined };
}

export async function regenerateDailyPlanAction(): Promise<
  ActionResult<{ message: string; planSize: number }>
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('scheduling_preferences')
    .eq('id', user.id)
    .single();

  const scheduling = profile?.scheduling_preferences as { timezone?: string } | null;
  const timezone = scheduling?.timezone ?? 'UTC';

  try {
    const result = await generateDailyPlan({
      userId: user.id,
      timezone,
      force: true,
      trigger: 'manual',
    });

    revalidatePlanSurfaces();

    return {
      success: true,
      data: {
        message: result.message,
        planSize: result.plan.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to regenerate plan',
    };
  }
}
