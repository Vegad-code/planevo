import { jsonSchema, tool } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { BrunoDataAccess } from '@/lib/bruno/types';
import { enrichBrunoProposal } from '@/lib/bruno/enrichProposalColor';
import { persistBrunoProposalArgs } from '@/lib/bruno/proposalPersistence';
import { executeApprovedBrunoAction } from '@/lib/bruno/agentLoop';
import {
  applyPlanStepSchema,
  coerceProposedActionInput,
  DESTRUCTIVE_ACTION_TYPES,
  proposedActionSchema,
  type BrunoActionTypeV3,
} from '@/lib/bruno/tools/schemas';

type Supabase = SupabaseClient<Database>;

const NON_MUTATING_TYPES = new Set(['NO_ACTION', 'EXPLAIN_PLAN']);

export const proposeActionParams = jsonSchema({
  type: 'object' as const,
  properties: {
    type: {
      type: 'string',
      enum: [
        'CREATE_TASK',
        'UPDATE_TASK',
        'RESCHEDULE_TASK',
        'CREATE_TIME_BLOCK',
        'UPDATE_CALENDAR_EVENT',
        'UPDATE_DAILY_PLAN',
        'EXPLAIN_PLAN',
        'NO_ACTION',
        'CREATE_NOTE',
        'UPDATE_NOTE',
        'APPEND_TO_NOTE',
        'ARCHIVE_NOTE',
        'DELETE_CALENDAR_EVENT',
        'DELETE_TASK',
      ],
    },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', minLength: 1, maxLength: 500 },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
    requiresConfirmation: { type: 'boolean' },
    payload: {
      type: 'object',
      properties: {
        taskTitle: { type: 'string' },
        notes: { type: 'string' },
        estimatedMinutes: { type: 'number' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'missed'] },
        completed: { type: 'boolean', description: 'Set true to mark a task done, false to reopen it' },
        completedAt: { type: 'string', description: 'ISO 8601 completion timestamp when marking a task done' },
        dueDate: { type: 'string' },
        startTime: { type: 'string', description: 'ISO 8601 start time for CREATE_TIME_BLOCK' },
        endTime: { type: 'string', description: 'ISO 8601 end time for CREATE_TIME_BLOCK' },
        durationMinutes: { type: 'number', description: 'Duration in minutes when endTime is omitted' },
        location: { type: 'string' },
        eventId: { type: 'string', description: 'UUID of an existing calendar event for UPDATE_CALENDAR_EVENT or DELETE_CALENDAR_EVENT' },
        taskId: { type: 'string', description: 'UUID of an existing task for UPDATE_TASK, RESCHEDULE_TASK, or DELETE_TASK' },
        noteId: { type: 'string' },
        noteTitle: { type: 'string' },
        contentMarkdown: { type: 'string' },
        appendMarkdown: { type: 'string' },
        color: { type: 'string', description: 'Hex color e.g. #039BE5 for calendar display' },
        colorCategory: {
          type: 'string',
          enum: ['study', 'exercise', 'break', 'admin', 'work', 'creative', 'social', 'health'],
          description: 'Semantic color category when proposing multiple tasks',
        },
        source: { type: 'string', enum: ['bruno'] },
      },
      additionalProperties: true,
    },
  },
  required: ['type', 'title', 'description'],
});

export const proposePlanParams = jsonSchema({
  type: 'object' as const,
  properties: {
    summary: {
      type: 'string',
      minLength: 1,
      maxLength: 2000,
      description: 'One or two sentences describing the whole plan for the user.',
    },
    steps: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'CREATE_TASK',
              'UPDATE_TASK',
              'RESCHEDULE_TASK',
              'CREATE_TIME_BLOCK',
              'UPDATE_CALENDAR_EVENT',
              'UPDATE_DAILY_PLAN',
              'CREATE_NOTE',
              'UPDATE_NOTE',
              'APPEND_TO_NOTE',
              'ARCHIVE_NOTE',
              'DELETE_CALENDAR_EVENT',
              'DELETE_TASK',
            ],
          },
          title: { type: 'string', minLength: 1, maxLength: 120 },
          description: { type: 'string', maxLength: 500 },
          ref: {
            type: 'string',
            maxLength: 60,
            description:
              'Optional name for this step so later steps can reference the created entity via taskIdRef/eventIdRef/noteIdRef/linkedTaskIdRef in their payload.',
          },
          payload: { type: 'object', additionalProperties: true },
        },
        required: ['type', 'title'],
      },
    },
  },
  required: ['summary', 'steps'],
});

const PROPOSE_ACTION_BASE_DESCRIPTION =
  'Create a proposal card for a Planevo action (task, calendar, plan, or note change). Use it whenever the user asks for any in-app change, however they phrase it — the user confirms the card before anything mutates, so prefer proposing a reasonable interpretation over holding back. DO NOT use for external integrations (Notion, Slack, Linear) — use Composio tools instead. This never mutates data directly. For existing calendar moves/edits/deletes, call get_calendar_events or search_calendar_events first and include payload.eventId. For task updates/reschedules/completion, include payload.taskId from get_tasks or search_tasks. To mark a task done, use UPDATE_TASK with payload.status="done" and payload.completed=true. For bulk moves ("move everything on Thursday"), call read tools for the source day, then call this tool once per event or task — never combine multiple items into one proposal. When proposing multiple CREATE_TASK or CREATE_TIME_BLOCK actions, assign each a distinct payload.colorCategory.';

const PROPOSE_PLAN_BASE_DESCRIPTION =
  'Create ONE plan card covering an ordered multi-step change (3+ related actions), confirmed by the user in a single tap — e.g. "plan my week", "clear my afternoon and move everything to tomorrow", a project breakdown with scheduled blocks. Read current state with read tools first, then list every step with real IDs. Steps run in order; give a step a "ref" name and reference the entity it creates in a later step via payload.taskIdRef / eventIdRef / noteIdRef / linkedTaskIdRef. For a single change, use propose_action instead. This never mutates data directly.';

const AGENT_LOOP_SUFFIX =
  ' When the user approves the card, the action executes immediately and you receive the result in this conversation — report the outcome plainly (what changed, or what failed and your next step). If the user declines, respect it and ask what to adjust.';

export type BrunoProposeToolDeps = {
  supabase: Supabase;
  userId: string;
  timeZone: string;
  referenceDate: Date;
  lastUserMessageText?: string;
  dataAccess: BrunoDataAccess;
  /** When true, tools use native approval + in-loop execution (Phase B). */
  agentLoop: boolean;
};

type PlanBuildResult =
  | { ok: true; planArgs: Record<string, unknown>; stepCount: number }
  | { ok: false; error: string };

async function enrichProposalInput(
  proposal: unknown,
  deps: BrunoProposeToolDeps
): Promise<Record<string, unknown>> {
  return enrichBrunoProposal(coerceProposedActionInput(proposal), {
    userId: deps.userId,
    supabase: deps.supabase,
    texts: deps.lastUserMessageText ? [deps.lastUserMessageText] : [],
    timeZone: deps.timeZone,
    referenceDate: deps.referenceDate,
  });
}

async function buildApplyPlanArgs(
  planInput: unknown,
  deps: BrunoProposeToolDeps
): Promise<PlanBuildResult> {
  const planRecord =
    typeof planInput === 'object' && planInput !== null
      ? (planInput as Record<string, unknown>)
      : {};
  const summary =
    typeof planRecord.summary === 'string' && planRecord.summary.trim()
      ? planRecord.summary.trim()
      : 'Apply this plan';
  const rawSteps = Array.isArray(planRecord.steps) ? planRecord.steps : [];

  const enrichedSteps: Array<Record<string, unknown>> = [];
  const stepErrors: string[] = [];
  for (const [index, rawStep] of rawSteps.entries()) {
    const enriched = await enrichProposalInput(rawStep, deps);
    const ref =
      typeof (rawStep as Record<string, unknown>)?.ref === 'string'
        ? (rawStep as Record<string, unknown>).ref
        : undefined;
    const parsedStep = applyPlanStepSchema.safeParse({ ...enriched, ref });
    if (!parsedStep.success) {
      stepErrors.push(
        `Step ${index + 1} (${String((rawStep as Record<string, unknown>)?.title ?? 'untitled')}): ${parsedStep.error.issues
          .map((issue) => issue.message)
          .slice(0, 2)
          .join('; ')}`
      );
      continue;
    }
    enrichedSteps.push(parsedStep.data);
  }

  if (stepErrors.length > 0) {
    return {
      ok: false,
      error: `Invalid plan steps — fix and retry: ${stepErrors.join(' | ')}`,
    };
  }
  if (enrichedSteps.length === 0) {
    return { ok: false, error: 'The plan has no valid steps.' };
  }

  const hasDestructiveStep = enrichedSteps.some((step) =>
    DESTRUCTIVE_ACTION_TYPES.has(step.type as BrunoActionTypeV3)
  );
  return {
    ok: true,
    stepCount: enrichedSteps.length,
    planArgs: {
      type: 'APPLY_PLAN',
      title: summary.length > 120 ? `${summary.slice(0, 117)}...` : summary,
      description: summary,
      riskLevel: hasDestructiveStep ? 'high' : 'medium',
      requiresConfirmation: true,
      payload: {
        planSummary: summary,
        steps: enrichedSteps,
      },
    },
  };
}

/**
 * The two write-path tools, in one of two modes:
 *
 * - Legacy (`agentLoop: false`): the tool persists a proposal and returns
 *   "waiting for confirmation"; the client later calls
 *   /api/bruno/actions/execute. Used by mobile and as kill-switch fallback.
 * - Agent loop (`agentLoop: true`): the tool declares `needsApproval`; the
 *   stream pauses on an approval card, and once the user approves, the SDK
 *   resumes the loop and `execute()` runs the action server-side. Invalid
 *   proposals skip approval so the model gets the validation error in-loop
 *   and can self-correct.
 */
export function buildBrunoProposeTools(deps: BrunoProposeToolDeps) {
  if (!deps.agentLoop) {
    return {
      propose_action: tool({
        description: PROPOSE_ACTION_BASE_DESCRIPTION,
        inputSchema: proposeActionParams,
        execute: async (proposal: unknown) => {
          const enrichedArgs = await enrichProposalInput(proposal, deps);
          const parsed = proposedActionSchema.safeParse(enrichedArgs);
          if (!parsed.success) {
            return {
              success: false,
              error: `Invalid proposal: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
            };
          }
          const { proposalId } = await persistBrunoProposalArgs(
            deps.supabase,
            deps.userId,
            parsed.data,
            'llm_propose_action'
          );
          return {
            success: true,
            proposalId,
            message: 'Proposal recorded. Waiting for user confirmation.',
          };
        },
      }),
      propose_plan: tool({
        description: PROPOSE_PLAN_BASE_DESCRIPTION,
        inputSchema: proposePlanParams,
        execute: async (planInput: unknown) => {
          const plan = await buildApplyPlanArgs(planInput, deps);
          if (!plan.ok) {
            return { success: false, error: plan.error };
          }
          const { proposalId } = await persistBrunoProposalArgs(
            deps.supabase,
            deps.userId,
            plan.planArgs,
            'llm_propose_plan'
          );
          return {
            success: true,
            proposalId,
            proposal: { ...plan.planArgs, id: proposalId },
            message: `Plan with ${plan.stepCount} steps recorded. Waiting for user confirmation.`,
          };
        },
      }),
    };
  }

  return {
    propose_action: tool({
      description: PROPOSE_ACTION_BASE_DESCRIPTION + AGENT_LOOP_SUFFIX,
      inputSchema: proposeActionParams,
      needsApproval: async (proposal: unknown) => {
        const record = coerceProposedActionInput(proposal);
        if (NON_MUTATING_TYPES.has(String(record.type))) return false;
        // Invalid proposals skip the approval pause so execute() can hand the
        // validation error straight back to the model.
        const enriched = await enrichProposalInput(proposal, deps);
        return proposedActionSchema.safeParse(enriched).success;
      },
      execute: async (proposal: unknown) => {
        const record = coerceProposedActionInput(proposal);
        if (NON_MUTATING_TYPES.has(String(record.type))) {
          return {
            success: true,
            executed: false,
            message:
              'No app change needed — answer the user directly in your reply.',
          };
        }
        const enriched = await enrichProposalInput(proposal, deps);
        const parsed = proposedActionSchema.safeParse(enriched);
        if (!parsed.success) {
          return {
            success: false,
            executed: false,
            error: `Invalid proposal: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
          };
        }
        return executeApprovedBrunoAction({
          supabase: deps.supabase,
          userId: deps.userId,
          args: parsed.data as Record<string, unknown>,
          source: 'llm_propose_action',
          userPrompt: deps.lastUserMessageText,
          timeZone: deps.timeZone,
          dataAccess: deps.dataAccess,
        });
      },
    }),
    propose_plan: tool({
      description: PROPOSE_PLAN_BASE_DESCRIPTION + AGENT_LOOP_SUFFIX,
      inputSchema: proposePlanParams,
      needsApproval: async (planInput: unknown) => {
        const plan = await buildApplyPlanArgs(planInput, deps);
        return plan.ok;
      },
      execute: async (planInput: unknown) => {
        const plan = await buildApplyPlanArgs(planInput, deps);
        if (!plan.ok) {
          return { success: false, executed: false, error: plan.error };
        }
        return executeApprovedBrunoAction({
          supabase: deps.supabase,
          userId: deps.userId,
          args: plan.planArgs,
          source: 'llm_propose_plan',
          userPrompt: deps.lastUserMessageText,
          timeZone: deps.timeZone,
          dataAccess: deps.dataAccess,
        });
      },
    }),
  };
}
