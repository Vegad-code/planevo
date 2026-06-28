import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { executeAction } from '@/lib/bruno/executeAction';
import type { ProposedAction } from '@/lib/bruno/tools/schemas';
import type { Database } from '@/types/database';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const TASK_ID = '22222222-2222-2222-2222-222222222222';
const NOTE_ID = '33333333-3333-3333-3333-333333333333';

function baseAction(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    type: 'CREATE_TASK',
    title: 'Test action',
    description: 'Test description',
    riskLevel: 'low',
    requiresConfirmation: true,
    payload: {},
    ...overrides,
  };
}

function createChainableSupabase(
  handlers: {
    maybeSingle?: () => Promise<{ data: unknown; error: unknown }>;
    single?: () => Promise<{ data: unknown; error: unknown }>;
    update?: () => Promise<{ data: unknown; error: unknown }>;
  } = {}
) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: handlers.update ?? handlers.maybeSingle ?? vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      })),
    })),
    maybeSingle: handlers.maybeSingle ?? vi.fn().mockResolvedValue({ data: null, error: null }),
    single: handlers.single ?? vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: vi.fn(() => chain),
    chain,
  } as unknown as SupabaseClient<Database>;
}

describe('executeAction', () => {
  it('returns noOp for EXPLAIN_PLAN without touching the database', async () => {
    const supabase = createChainableSupabase();

    const result = await executeAction(baseAction({ type: 'EXPLAIN_PLAN' }), {
      userId: USER_ID,
      supabase,
    });

    expect(result).toEqual({ success: true, data: { noOp: true } });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns noOp for NO_ACTION', async () => {
    const result = await executeAction(baseAction({ type: 'NO_ACTION' }), {
      userId: USER_ID,
      supabase: createChainableSupabase(),
    });

    expect(result).toEqual({ success: true, data: { noOp: true } });
  });

  it('rejects destructive DELETE_TASK when confirmation flags are missing', async () => {
    const supabase = createChainableSupabase();

    const result = await executeAction(
      baseAction({
        type: 'DELETE_TASK',
        riskLevel: 'low',
        requiresConfirmation: false,
        payload: { taskId: TASK_ID },
      }),
      { userId: USER_ID, supabase }
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires explicit confirmation/i);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('rejects DELETE_TASK when taskId is missing', async () => {
    const result = await executeAction(
      baseAction({
        type: 'DELETE_TASK',
        riskLevel: 'high',
        requiresConfirmation: true,
        payload: {},
      }),
      { userId: USER_ID, supabase: createChainableSupabase() }
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/task id is required/i);
  });

  it('rejects UPDATE_NOTE when note is not found for the user', async () => {
    const supabase = createChainableSupabase({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await executeAction(
      baseAction({
        type: 'UPDATE_NOTE',
        payload: { noteId: NOTE_ID, contentMarkdown: '# Updated' },
      }),
      { userId: USER_ID, supabase }
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found or access denied/i);
  });

  it('soft-deletes a task when destructive confirmation is valid', async () => {
    const supabase = createChainableSupabase({
      update: vi.fn().mockResolvedValue({
        data: { id: TASK_ID, title: 'Removed task' },
        error: null,
      }),
    });

    const result = await executeAction(
      baseAction({
        type: 'DELETE_TASK',
        riskLevel: 'high',
        requiresConfirmation: true,
        payload: { taskId: TASK_ID },
      }),
      { userId: USER_ID, supabase }
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ taskId: TASK_ID, title: 'Removed task' });
  });
});

/**
 * Manual QA checklist (propose → confirm → execute):
 * 1. CREATE_TASK — ask Bruno to add a task; confirm card; verify task appears in task list.
 * 2. CREATE_TIME_BLOCK — schedule a block; confirm; verify calendar_events row and Google sync attempt.
 * 3. CREATE_NOTE — ask for a note; confirm; verify content_json, content_markdown, and content fields.
 * 4. get_calendar_events — ask "what's on my calendar today?"; verify tool call, no hallucinated events.
 * 5. DELETE_TASK — propose removal with high risk; confirm; verify soft-delete (deleted_at set).
 * 6. Cross-user security — attempt execute with another user's taskId/noteId; expect 403/400.
 */
