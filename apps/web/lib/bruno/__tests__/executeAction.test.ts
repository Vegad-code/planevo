import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { executeAction } from '@/lib/bruno/executeAction';
import type { ProposedAction } from '@/lib/bruno/tools/schemas';
import type { Database } from '@/types/database';
import * as googleCalendar from '@/lib/integrations/google-calendar';

vi.mock('@/lib/integrations/google-calendar', () => ({
  deleteEventFromGoogle: vi.fn(),
  hasGoogleWriteScope: vi.fn(),
  pushEventToGoogle: vi.fn(),
  syncGoogleCalendar: vi.fn(),
}));

const USER_ID = '11111111-1111-1111-1111-111111111111';
const TASK_ID = '22222222-2222-2222-2222-222222222222';
const NOTE_ID = '33333333-3333-3333-3333-333333333333';
const EVENT_ID = '44444444-4444-4444-4444-444444444444';
const SOURCE_ITEM_ID = '55555555-5555-4555-9555-555555555555';

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

function createCalendarMutationSupabase(existing: unknown, updated: unknown = null) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValueOnce({ data: existing, error: null })
    .mockResolvedValueOnce({ data: updated, error: null });
  const table = {
    select: vi.fn(() => table),
    eq: vi.fn(() => table),
    is: vi.fn(() => table),
    update: vi.fn(() => table),
    maybeSingle,
  };

  return {
    supabase: { from: vi.fn(() => table) } as unknown as SupabaseClient<Database>,
    table,
  };
}

function createMaybeSingleTable(sequence: Array<{ data: unknown; error: unknown }>) {
  const maybeSingle = vi.fn();
  for (const result of sequence) {
    maybeSingle.mockResolvedValueOnce(result);
  }
  const table = {
    select: vi.fn(() => table),
    eq: vi.fn(() => table),
    is: vi.fn(() => table),
    update: vi.fn(() => table),
    maybeSingle,
  };

  return table;
}

function createSourceItemFallbackSupabase(input: {
  sourceItem: unknown;
  updatedSourceItem: unknown;
}) {
  const tasksTable = createMaybeSingleTable([{ data: null, error: null }]);
  const sourceItemsTable = createMaybeSingleTable([
    { data: input.sourceItem, error: null },
    { data: input.updatedSourceItem, error: null },
  ]);

  return {
    supabase: {
      from: vi.fn((table: string) =>
        table === 'source_items' ? sourceItemsTable : tasksTable
      ),
    } as unknown as SupabaseClient<Database>,
    tasksTable,
    sourceItemsTable,
  };
}

function createStaleUuidSupabase(input: {
  resolvedRow: unknown;
  updated: unknown;
}) {
  // 1st maybeSingle: primary-key lookup misses (id was recycled by a resync).
  // 2nd maybeSingle: the post-update select returns the written row.
  const maybeSingle = vi
    .fn()
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: input.updated, error: null });
  // external_id fallback resolves to exactly one live row.
  const limit = vi.fn().mockResolvedValueOnce({ data: [input.resolvedRow], error: null });
  const table = {
    select: vi.fn(() => table),
    eq: vi.fn(() => table),
    ilike: vi.fn(() => table),
    limit,
    update: vi.fn(() => table),
    maybeSingle,
  };

  return {
    supabase: { from: vi.fn(() => table) } as unknown as SupabaseClient<Database>,
    table,
  };
}

function createCalendarResolveSupabase(input: {
  resolveRows: Array<{ id: string; title: string }>;
  existing: unknown;
  updated: unknown;
}) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValueOnce({ data: input.existing, error: null })
    .mockResolvedValueOnce({ data: input.updated, error: null });
  const table = {
    select: vi.fn(() => table),
    eq: vi.fn(() => table),
    ilike: vi.fn(() => table),
    limit: vi.fn().mockResolvedValue({ data: input.resolveRows, error: null }),
    update: vi.fn(() => table),
    maybeSingle,
  };

  return {
    supabase: { from: vi.fn(() => table) } as unknown as SupabaseClient<Database>,
    table,
  };
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

  it('marks a task complete through UPDATE_TASK status fields', async () => {
    const completedAt = '2026-07-01T20:00:00.000Z';
    const { supabase, table } = createCalendarMutationSupabase({
        id: TASK_ID,
        title: 'Read chapter 4',
        status: 'done',
        completed: true,
        completed_at: completedAt,
    });

    const result = await executeAction(
      baseAction({
        type: 'UPDATE_TASK',
        payload: {
          taskId: TASK_ID,
          status: 'done',
          completed: true,
          completedAt,
        },
      }),
      { userId: USER_ID, supabase }
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      taskId: TASK_ID,
      title: 'Read chapter 4',
      status: 'done',
      completed: true,
      completedAt,
    });
    expect(table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'done',
        completed: true,
        completed_at: completedAt,
      })
    );
  });

  it('marks a source item complete when UPDATE_TASK targets an imported task', async () => {
    const completedAt = '2026-07-01T20:00:00.000Z';
    const { supabase, sourceItemsTable } = createSourceItemFallbackSupabase({
      sourceItem: {
        id: SOURCE_ITEM_ID,
        external_id: 'linear-issue-1',
        title: 'Imported issue',
        due_date: '2026-07-03',
        deleted_at: null,
      },
      updatedSourceItem: {
        id: SOURCE_ITEM_ID,
        external_id: 'linear-issue-1',
        title: 'Imported issue',
        due_date: '2026-07-03',
        deleted_at: completedAt,
      },
    });

    const result = await executeAction(
      baseAction({
        type: 'UPDATE_TASK',
        payload: {
          taskId: SOURCE_ITEM_ID,
          status: 'done',
          completed: true,
          completedAt,
        },
      }),
      { userId: USER_ID, supabase }
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        taskId: SOURCE_ITEM_ID,
        sourceItemId: SOURCE_ITEM_ID,
        externalId: 'linear-issue-1',
        completed: true,
        completedAt,
        taskSource: 'source_item',
      })
    );
    expect(sourceItemsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: completedAt,
      })
    );
  });

  it('reschedules a source item when RESCHEDULE_TASK cannot find a native task', async () => {
    const dueDate = '2026-07-05';
    const { supabase, sourceItemsTable } = createSourceItemFallbackSupabase({
      sourceItem: {
        id: SOURCE_ITEM_ID,
        external_id: 'notion-task-1',
        title: 'Imported Notion task',
        due_date: null,
        deleted_at: null,
      },
      updatedSourceItem: {
        id: SOURCE_ITEM_ID,
        external_id: 'notion-task-1',
        title: 'Imported Notion task',
        due_date: dueDate,
        deleted_at: null,
      },
    });

    const result = await executeAction(
      baseAction({
        type: 'RESCHEDULE_TASK',
        payload: { taskId: SOURCE_ITEM_ID, dueDate },
      }),
      { userId: USER_ID, supabase }
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        sourceItemId: SOURCE_ITEM_ID,
        externalId: 'notion-task-1',
        dueDate,
        taskSource: 'source_item',
      })
    );
    expect(sourceItemsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({ due_date: dueDate })
    );
  });

  it('soft-deletes a source item when DELETE_TASK cannot find a native task', async () => {
    const { supabase, sourceItemsTable } = createSourceItemFallbackSupabase({
      sourceItem: {
        id: SOURCE_ITEM_ID,
        external_id: 'slack-todo-1',
        title: 'Imported Slack todo',
        due_date: null,
        deleted_at: null,
      },
      updatedSourceItem: {
        id: SOURCE_ITEM_ID,
        external_id: 'slack-todo-1',
        title: 'Imported Slack todo',
        due_date: null,
        deleted_at: '2026-07-01T20:00:00.000Z',
      },
    });

    const result = await executeAction(
      baseAction({
        type: 'DELETE_TASK',
        riskLevel: 'high',
        requiresConfirmation: true,
        payload: { taskId: SOURCE_ITEM_ID },
      }),
      { userId: USER_ID, supabase }
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        taskId: SOURCE_ITEM_ID,
        sourceItemId: SOURCE_ITEM_ID,
        externalId: 'slack-todo-1',
        title: 'Imported Slack todo',
        taskSource: 'source_item',
      })
    );
    expect(sourceItemsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      })
    );
  });

  it('updates an existing calendar event when the proposal includes an eventId', async () => {
    const { supabase, table } = createCalendarMutationSupabase(
      {
        id: EVENT_ID,
        title: 'Meeting',
        start_time: '2026-07-02T23:00:00.000Z',
        end_time: '2026-07-03T01:00:00.000Z',
        external_id: null,
        source: 'schedule',
        metadata: {},
        is_all_day: false,
      },
      {
        id: EVENT_ID,
        title: 'Meeting',
        start_time: '2026-07-03T23:00:00.000Z',
        end_time: '2026-07-04T01:00:00.000Z',
      }
    );

    const result = await executeAction(
      baseAction({
        type: 'UPDATE_CALENDAR_EVENT',
        payload: {
          eventId: EVENT_ID,
          startTime: '2026-07-03T23:00:00.000Z',
          endTime: '2026-07-04T01:00:00.000Z',
        },
      }),
      { userId: USER_ID, supabase, timeZone: 'America/Los_Angeles' }
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      eventId: EVENT_ID,
      title: 'Meeting',
      startTime: '2026-07-03T23:00:00.000Z',
      endTime: '2026-07-04T01:00:00.000Z',
    });
    expect(table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '2026-07-03T23:00:00.000Z',
        end_time: '2026-07-04T01:00:00.000Z',
      })
    );
  });

  it('resolves a unique existing calendar event by title when eventId is missing', async () => {
    const { supabase, table } = createCalendarResolveSupabase({
      resolveRows: [{ id: EVENT_ID, title: 'Meeting' }],
      existing: {
        id: EVENT_ID,
        title: 'Meeting',
        start_time: '2026-07-02T23:00:00.000Z',
        end_time: '2026-07-03T01:00:00.000Z',
        external_id: null,
        source: 'schedule',
        metadata: {},
        is_all_day: false,
      },
      updated: {
        id: EVENT_ID,
        title: 'Meeting',
        start_time: '2026-07-03T23:00:00.000Z',
        end_time: '2026-07-04T01:00:00.000Z',
      },
    });

    const result = await executeAction(
      baseAction({
        type: 'UPDATE_CALENDAR_EVENT',
        title: 'meeting',
        payload: {
          startTime: '2026-07-03T23:00:00.000Z',
          endTime: '2026-07-04T01:00:00.000Z',
        },
      }),
      { userId: USER_ID, supabase, timeZone: 'America/Los_Angeles' }
    );

    expect(result.success).toBe(true);
    expect(table.ilike).toHaveBeenCalledWith('title', 'meeting');
    expect(table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '2026-07-03T23:00:00.000Z',
        end_time: '2026-07-04T01:00:00.000Z',
      })
    );
  });

  it('re-resolves a Google event by external_id when the pinned eventId is stale', async () => {
    // Simulates a Google resync recycling the row UUID between propose and execute:
    // the proposal's eventId no longer exists, but externalId still resolves the row.
    const STALE_ID = '99999999-9999-9999-9999-999999999999';
    const NEW_ID = '55555555-5555-5555-5555-555555555555';
    vi.mocked(googleCalendar.hasGoogleWriteScope).mockResolvedValueOnce(true);
    vi.mocked(googleCalendar.pushEventToGoogle).mockResolvedValueOnce({
      success: true,
      googleEventId: 'google-event-js',
    });

    const { supabase, table } = createStaleUuidSupabase({
      resolvedRow: {
        id: NEW_ID,
        title: 'JS Study',
        start_time: '2026-07-13T23:00:00.000Z',
        end_time: '2026-07-14T00:00:00.000Z',
        external_id: 'google-event-js',
        source: 'google_calendar',
        metadata: {},
        is_all_day: false,
      },
      updated: {
        id: NEW_ID,
        title: 'JS Study',
        start_time: '2026-07-14T23:00:00.000Z',
        end_time: '2026-07-15T00:00:00.000Z',
      },
    });

    const result = await executeAction(
      baseAction({
        type: 'UPDATE_CALENDAR_EVENT',
        payload: {
          eventId: STALE_ID,
          externalId: 'google-event-js',
          startTime: '2026-07-14T23:00:00.000Z',
          endTime: '2026-07-15T00:00:00.000Z',
        },
      }),
      { userId: USER_ID, supabase, timeZone: 'America/Los_Angeles' }
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      eventId: NEW_ID,
      title: 'JS Study',
      startTime: '2026-07-14T23:00:00.000Z',
      endTime: '2026-07-15T00:00:00.000Z',
    });
    expect(table.limit).toHaveBeenCalled();
    expect(table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        start_time: '2026-07-14T23:00:00.000Z',
        end_time: '2026-07-15T00:00:00.000Z',
      })
    );
  });

  it('blocks Google-backed calendar updates when write scope is missing', async () => {
    vi.mocked(googleCalendar.hasGoogleWriteScope).mockResolvedValueOnce(false);
    const { supabase, table } = createCalendarMutationSupabase({
      id: EVENT_ID,
      title: 'Google Meeting',
      start_time: '2026-07-02T23:00:00.000Z',
      end_time: '2026-07-03T01:00:00.000Z',
      external_id: 'google-event-1',
      source: 'google_calendar',
      metadata: {},
      is_all_day: false,
    });

    const result = await executeAction(
      baseAction({
        type: 'UPDATE_CALENDAR_EVENT',
        payload: {
          eventId: EVENT_ID,
          startTime: '2026-07-03T23:00:00.000Z',
          endTime: '2026-07-04T01:00:00.000Z',
        },
      }),
      { userId: USER_ID, supabase, timeZone: 'America/Los_Angeles' }
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/google calendar write permission/i);
    expect(table.update).not.toHaveBeenCalled();
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
