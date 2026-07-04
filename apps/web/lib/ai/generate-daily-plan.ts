import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBrunoMasterContext } from '@/lib/ai/orchestrator';
import { getUserAIMemory } from '@/lib/ai/memory';
import { resolveProposalColor } from '@/lib/bruno/proposalColors';
import { posthogServer } from '@/lib/posthog-server';
import { inferEnergyLevel } from '@/lib/plan/infer-energy';
import { getDayBounds, hasLockedPlanToday } from '@/lib/plan/day-plan';
import { buildDeterministicDailyPlan } from '@/lib/plan/agent/planner';
import type {
  DailyPlanCandidateItem,
  DailyPlanDraftBlock,
  DailyPlanPriority,
  DailyPlanSource,
  FixedScheduleBlock,
} from '@/lib/plan/agent/types';
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

const PLANNER_VERSION = 'agentic-daily-plan-v1';

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizePriority(value: unknown): DailyPlanPriority {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'urgent') return 'urgent';
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
}

function isSupportedSource(value: unknown): value is DailyPlanSource {
  return (
    value === 'task' ||
    value === 'canvas' ||
    value === 'google_calendar' ||
    value === 'notion' ||
    value === 'slack' ||
    value === 'linear'
  );
}

function sourceForWorldTask(task: Record<string, unknown>): DailyPlanSource {
  if (isSupportedSource(task.provider)) return task.provider;
  if (task.is_assignment === true) return 'canvas';
  return 'task';
}

function mapWorldTaskToCandidate(task: Record<string, unknown>): DailyPlanCandidateItem | null {
  const id = asString(task.id);
  const title = asString(task.title);
  if (!id || !title) return null;

  const source = sourceForWorldTask(task);
  const dueAt = asString(task.due_at) ?? asString(task.due_date);
  const estimatedMinutes = Math.max(15, Math.round(asNumber(task.estimated_minutes) ?? 45));
  const priority = normalizePriority(task.priority);

  return {
    id: `${source}:${id}`,
    rawSourceId: id,
    source,
    title,
    description: asString(task.description) ?? asString(task.notes),
    dueAt,
    startAt: null,
    endAt: null,
    estimatedMinutes,
    priority,
    status: asString(task.status),
    url: asString(task.external_url),
    confidenceSignals: [
      source === 'task' ? 'native_task' : `provider:${source}`,
      dueAt ? 'due_date' : 'missing_due_date',
      `priority:${priority}`,
    ],
  };
}

function buildFixedBlocks(rows: Tables<'calendar_events'>[]): FixedScheduleBlock[] {
  return rows
    .filter((row) => !(row.is_ai_suggested === true && row.status === 'pending'))
    .filter((row) => row.start_time && row.end_time)
    .map((row) => ({
      id: row.id,
      title: row.title,
      startTime: row.start_time,
      endTime: row.end_time as string,
      source: row.source,
    }));
}

function planItemFromBlock(block: DailyPlanDraftBlock): GeneratedPlanItem {
  return {
    id: block.candidateId ?? undefined,
    title: block.title,
    reason: block.reason,
    suggested_start: block.startTime,
    suggested_end: block.endTime,
  };
}

function buildAgenticMessage(planSize: number, overflow: number): string {
  if (planSize === 0 && overflow > 0) {
    return `${overflow} item${overflow === 1 ? '' : 's'} need attention, but none fit cleanly today.`;
  }
  if (planSize === 0) {
    return 'Your calendar has breathing room today.';
  }
  if (overflow > 0) {
    return `I planned ${planSize} block${planSize === 1 ? '' : 's'} and flagged ${overflow} item${overflow === 1 ? '' : 's'} for review.`;
  }
  return `I planned ${planSize} focused block${planSize === 1 ? '' : 's'} around your fixed schedule.`;
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

  const existingRowsForDay = (existingRows ?? []) as Tables<'calendar_events'>[];
  const candidates = worldState.tasks
    .map((task) => mapWorldTaskToCandidate(task as Record<string, unknown>))
    .filter((candidate): candidate is DailyPlanCandidateItem => candidate !== null);

  if (candidates.length === 0) {
    return {
      ok: true,
      plan: [],
      overflow: 0,
      summary: 'Nothing to schedule today.',
      message: 'No schedulable work found for today.',
      energyLevel,
    };
  }

  const agentPlan = buildDeterministicDailyPlan({
    localDate: resolvedDayStart.toISOString().slice(0, 10),
    dayStart: resolvedDayStart.toISOString(),
    dayEnd: resolvedDayEnd.toISOString(),
    now: now.toISOString(),
    candidates,
    fixedBlocks: buildFixedBlocks(existingRowsForDay),
    preferredFocusWindow: userRow?.energy_preference === 'evening'
      ? 'evening'
      : userRow?.energy_preference === 'afternoon'
        ? 'afternoon'
        : 'morning',
    bufferMinutes: 10,
  });

  const planBlocks = agentPlan.blocks.filter((block) => block.type === 'focus');
  const plan = planBlocks.map(planItemFromBlock);
  const overflow = agentPlan.overflowItems.length;
  const parsedMessage = buildAgenticMessage(plan.length, overflow);

  if (plan.length > 0) {
    const ghostBlocks = agentPlan.blocks.map((block, index) => {
      const rawSourceId = block.candidateId?.split(':').slice(1).join(':') ?? null;
      const taskId = block.source === 'task' && rawSourceId && isUuid(rawSourceId) ? rawSourceId : null;
      const blockColor = resolveProposalColor({
        title: block.title,
        description: block.reason,
        batchIndex: index,
      });

      return {
        user_id: userId,
        title: block.title,
        start_time: block.startTime,
        end_time: block.endTime,
        linked_task_id: taskId,
        external_id: null,
        source: 'schedule',
        color: blockColor,
        energy_level: block.type === 'buffer' ? 'low' : energyLevel,
        is_ai_suggested: true,
        status: 'pending',
        metadata: {
          reason: block.reason,
          confidence: block.confidence,
          confidenceFactors: block.confidenceFactors,
          sourceIds: block.candidateId ? [block.candidateId] : [],
          constraintsUsed: block.constraintsUsed,
          plannerVersion: PLANNER_VERSION,
          blockKind: block.type,
          source: block.source,
          source_item_id: block.source !== 'task' ? rawSourceId : null,
          canvas_id: block.source === 'canvas' ? rawSourceId : null,
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
      planner_version: PLANNER_VERSION,
      capacity_status: agentPlan.capacity.status,
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
    focusScore: agentPlan.capacity.availableFocusMinutes > 0
      ? Math.round((agentPlan.capacity.plannedFocusMinutes / agentPlan.capacity.availableFocusMinutes) * 100)
      : undefined,
    vibe: agentPlan.capacity.status,
  };
}
