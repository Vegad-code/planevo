import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { executeAction } from '@/lib/bruno/executeAction';
import {
  coerceProposedActionInput,
  proposedActionSchema,
  type ProposedAction,
} from '@/lib/bruno/tools/schemas';
import type { Database } from '@/types/database';

vi.mock('@/lib/integrations/google-calendar', () => ({
  deleteEventFromGoogle: vi.fn(),
  hasGoogleWriteScope: vi.fn(),
  pushEventToGoogle: vi.fn(),
  syncGoogleCalendar: vi.fn(),
}));

const USER_ID = '11111111-1111-1111-1111-111111111111';

function planAction(payload: Record<string, unknown>): ProposedAction {
  return {
    type: 'APPLY_PLAN',
    title: 'Apply plan',
    description: 'Plan description',
    riskLevel: 'medium',
    requiresConfirmation: true,
    payload,
  };
}

describe('propose-time per-type validation', () => {
  it('rejects UPDATE_TASK without a taskId with an actionable message', () => {
    const parsed = proposedActionSchema.safeParse(
      coerceProposedActionInput({
        type: 'UPDATE_TASK',
        title: 'Mark essay done',
        description: 'Complete the essay task',
        payload: { status: 'done' },
      })
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain('requires payload.taskId');
    }
  });

  it('rejects UPDATE_CALENDAR_EVENT without any event identity', () => {
    const parsed = proposedActionSchema.safeParse(
      coerceProposedActionInput({
        type: 'UPDATE_CALENDAR_EVENT',
        title: 'Move gym to 4pm',
        description: 'Shift the gym block',
        payload: { startTime: '2026-07-03T20:00:00.000Z' },
      })
    );
    expect(parsed.success).toBe(false);
  });

  it('forces destructive invariants during coercion', () => {
    const coerced = coerceProposedActionInput({
      type: 'DELETE_TASK',
      title: 'Remove old task',
      description: 'Delete it',
      riskLevel: 'low',
      requiresConfirmation: false,
      payload: { taskId: '22222222-2222-2222-2222-222222222222' },
    });
    expect(coerced.riskLevel).toBe('high');
    expect(coerced.requiresConfirmation).toBe(true);
  });

  it('accepts a valid APPLY_PLAN payload and rejects an empty one', () => {
    const valid = proposedActionSchema.safeParse(
      planAction({
        planSummary: 'Two tasks',
        steps: [
          {
            type: 'CREATE_TASK',
            title: 'Read chapter 4',
            payload: { taskTitle: 'Read chapter 4' },
          },
        ],
      })
    );
    expect(valid.success).toBe(true);

    const empty = proposedActionSchema.safeParse(planAction({ steps: [] }));
    expect(empty.success).toBe(false);
  });
});

describe('executeAction APPLY_PLAN', () => {
  it('fails cleanly when the plan has no steps', async () => {
    const result = await executeAction(planAction({ steps: [] }), {
      userId: USER_ID,
      supabase: {} as SupabaseClient<Database>,
      timeZone: 'UTC',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('no steps');
  });

  it('rejects nested plans', async () => {
    const result = await executeAction(
      planAction({
        steps: [
          {
            type: 'APPLY_PLAN',
            title: 'Nested plan',
            description: 'nope',
            payload: { steps: [] },
          },
        ],
      }),
      {
        userId: USER_ID,
        supabase: {} as SupabaseClient<Database>,
        timeZone: 'UTC',
      }
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Nested plans are not allowed');
  });

  it('executes steps in order, resolves refs, and reports per-step results', async () => {
    const createdTaskId = '66666666-6666-4666-9666-666666666666';
    const insertedRows: Array<Record<string, unknown>> = [];

    const insertChain = {
      insert: vi.fn((row: Record<string, unknown>) => {
        insertedRows.push(row);
        return {
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: createdTaskId, title: row.title },
              error: null,
            }),
          })),
        };
      }),
    };
    const supabase = {
      from: vi.fn(() => insertChain),
    } as unknown as SupabaseClient<Database>;

    const result = await executeAction(
      planAction({
        planSummary: 'Create two linked tasks',
        steps: [
          {
            type: 'CREATE_TASK',
            title: 'Draft outline',
            description: 'First step',
            ref: 'outline',
            payload: { taskTitle: 'Draft outline' },
          },
          {
            type: 'CREATE_TASK',
            title: 'Write intro',
            description: 'Second step',
            payload: { taskTitle: 'Write intro', linkedTaskIdRef: 'outline' },
          },
        ],
      }),
      { userId: USER_ID, supabase, timeZone: 'UTC' }
    );

    expect(result.success).toBe(true);
    const data = result.data as {
      steps: Array<{ success: boolean; entityId?: string; ref?: string }>;
      completedSteps: number;
      totalSteps: number;
    };
    expect(data.completedSteps).toBe(2);
    expect(data.totalSteps).toBe(2);
    expect(data.steps[0].ref).toBe('outline');
    expect(data.steps[0].entityId).toBe(createdTaskId);
    expect(data.steps.every((step) => step.success)).toBe(true);
  });

  it('halts at the first failing step and reports partial progress', async () => {
    const single = vi
      .fn()
      .mockResolvedValueOnce({
        data: { id: '77777777-7777-4777-9777-777777777777', title: 'ok' },
        error: null,
      })
      .mockResolvedValue({ data: null, error: { message: 'boom' } });
    const failingChain = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single })),
      })),
    };
    const supabase = {
      from: vi.fn(() => failingChain),
    } as unknown as SupabaseClient<Database>;

    const result = await executeAction(
      planAction({
        steps: [
          { type: 'CREATE_TASK', title: 'First', payload: {} },
          { type: 'CREATE_TASK', title: 'Second', payload: {} },
          { type: 'CREATE_TASK', title: 'Third (never runs)', payload: {} },
        ],
      }),
      { userId: USER_ID, supabase, timeZone: 'UTC' }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Applied 1 of 3 steps');
    const data = result.data as { steps: Array<{ success: boolean }> };
    expect(data.steps).toHaveLength(2);
  });
});
