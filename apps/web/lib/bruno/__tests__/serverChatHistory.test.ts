import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  partsForModel,
  persistBrunoAssistantTurn,
  persistBrunoUserTurn,
  resolveAuthoritativeChatMessages,
  sanitizeUiMessagePartsForStorage,
} from '@/lib/bruno/serverChatHistory';
import type { Database } from '@/types/database';

const USER_ID = 'user-1';
const CONV_ID = 'conv-1';

function createHistorySupabase(options: {
  lastRow?: { message_type: string; content: string; id?: string } | null;
  rows?: Array<Record<string, unknown>>;
  activeUserId?: string | null;
}) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  const table = {
    select: vi.fn(() => table),
    eq: vi.fn(() => table),
    is: vi.fn(() => table),
    order: vi.fn((column: string, opts?: { ascending?: boolean }) => {
      if (opts?.ascending === false) {
        return {
          limit: vi.fn().mockResolvedValue({
            data: options.lastRow
              ? [options.lastRow]
              : options.activeUserId
                ? [{ id: options.activeUserId }]
                : [],
            error: null,
          }),
        };
      }
      return Promise.resolve({ data: options.rows ?? [], error: null });
    }),
    insert: vi.fn((row: Record<string, unknown>) => {
      inserts.push(row);
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: row.id ?? 'generated-user-id' },
            error: null,
          }),
        })),
      };
    }),
    update: vi.fn((row: Record<string, unknown>) => {
      updates.push(row);
      return table;
    }),
    then: undefined as unknown,
  };
  // Make the chained update(...).eq(...).eq(...).eq(...) awaitable.
  (table as { then: unknown }).then = (
    resolve: (value: { data: null; error: null }) => void
  ) => resolve({ data: null, error: null });
  return {
    supabase: { from: vi.fn(() => table) } as unknown as SupabaseClient<Database>,
    inserts,
    updates,
  };
}

describe('sanitizeUiMessagePartsForStorage', () => {
  it('keeps text, tool, and data parts; drops reasoning and step markers', () => {
    const sanitized = sanitizeUiMessagePartsForStorage([
      { type: 'step-start' },
      { type: 'reasoning', text: 'thinking...' },
      { type: 'text', text: 'Here is your plan.' },
      {
        type: 'tool-propose_action',
        toolCallId: 'call-1',
        state: 'output-available',
        input: { type: 'CREATE_TASK', title: 'Read' },
        output: { success: true, proposalId: 'p1' },
        callProviderMetadata: { openai: { secret: 'x' } },
      },
      { type: 'data-bruno-action-proposals', data: { proposals: [] } },
    ]);

    expect(sanitized).toHaveLength(3);
    const types = (sanitized ?? []).map((p) => (p as { type: string }).type);
    expect(types).toEqual([
      'text',
      'tool-propose_action',
      'data-bruno-action-proposals',
    ]);
    const toolPart = (sanitized ?? [])[1] as Record<string, unknown>;
    expect(toolPart.callProviderMetadata).toBeUndefined();
  });

  it('truncates oversized tool outputs', () => {
    const sanitized = sanitizeUiMessagePartsForStorage([
      {
        type: 'tool-get_tasks',
        toolCallId: 'call-2',
        state: 'output-available',
        input: {},
        output: { rows: 'x'.repeat(20_000) },
      },
    ]);
    const toolPart = (sanitized ?? [])[0] as { output: unknown };
    expect(toolPart.output).toEqual({ truncated: true });
  });

  it('returns null when nothing is worth keeping', () => {
    expect(
      sanitizeUiMessagePartsForStorage([{ type: 'reasoning', text: 'hmm' }])
    ).toBeNull();
  });
});

describe('partsForModel', () => {
  it('keeps text and completed tool calls, drops data parts and pending calls', () => {
    const parts = partsForModel([
      { type: 'text', text: 'Done.' },
      { type: 'tool-propose_action', state: 'output-available', toolCallId: 'a', input: {}, output: {} },
      { type: 'tool-get_tasks', state: 'input-streaming', toolCallId: 'b', input: {} },
      { type: 'data-bruno-action-proposals', data: {} },
    ]);
    expect(parts).toHaveLength(2);
  });
});

describe('partsForModel approval states', () => {
  const APPROVAL_REQUESTED = {
    type: 'tool-propose_action',
    toolCallId: 'c1',
    state: 'approval-requested',
    input: { type: 'CREATE_TASK', title: 'Read' },
    approval: { id: 'appr-1' },
  };
  const OUTPUT_DENIED = {
    type: 'tool-propose_action',
    toolCallId: 'c2',
    state: 'output-denied',
    input: { type: 'DELETE_TASK', title: 'Drop' },
    approval: { id: 'appr-2', approved: false },
  };

  it('always keeps user-denied tool calls so the model knows the outcome', () => {
    const parts = partsForModel([OUTPUT_DENIED]);
    expect(parts).toHaveLength(1);
  });

  it('keeps pending approval requests only when asked to (agent-loop resume)', () => {
    expect(partsForModel([APPROVAL_REQUESTED])).toBeNull();
    expect(
      partsForModel([APPROVAL_REQUESTED], { keepPendingApprovals: true })
    ).toHaveLength(1);
  });
});

describe('persistBrunoUserTurn', () => {
  it('skips when the latest row already holds the same user text', async () => {
    const { supabase, inserts } = createHistorySupabase({
      lastRow: { message_type: 'user', content: 'Plan my day' },
    });
    await persistBrunoUserTurn(supabase, {
      userId: USER_ID,
      conversationId: CONV_ID,
      text: 'Plan my day',
    });
    expect(inserts).toHaveLength(0);
  });

  it('inserts when the latest row differs', async () => {
    const { supabase, inserts } = createHistorySupabase({
      lastRow: { message_type: 'assistant', content: 'Sure!' },
    });
    const id = await persistBrunoUserTurn(supabase, {
      userId: USER_ID,
      conversationId: CONV_ID,
      text: 'Plan my day',
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      message_type: 'user',
      content: 'Plan my day',
      conversation_id: CONV_ID,
      variant_index: 0,
      is_active_variant: true,
    });
    expect(inserts[0].turn_key).toEqual(expect.any(String));
    expect(id).toBe('generated-user-id');
  });

  it('uses client uuid as id and turn_key when provided', async () => {
    const clientId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const { supabase, inserts } = createHistorySupabase({
      lastRow: { message_type: 'assistant', content: 'Sure!' },
    });
    const id = await persistBrunoUserTurn(supabase, {
      userId: USER_ID,
      conversationId: CONV_ID,
      text: 'Plan my day',
      messageId: clientId,
    });
    expect(inserts[0].id).toBe(clientId);
    expect(inserts[0].turn_key).toBe(clientId);
    expect(id).toBe(clientId);
  });
});

describe('persistBrunoAssistantTurn', () => {
  it('stores extracted text plus sanitized parts', async () => {
    const { supabase, inserts } = createHistorySupabase({});
    await persistBrunoAssistantTurn(supabase, {
      userId: USER_ID,
      conversationId: CONV_ID,
      message: {
        parts: [
          { type: 'text', text: 'Proposed two changes.' },
          {
            type: 'tool-propose_action',
            toolCallId: 'c1',
            state: 'output-available',
            input: { type: 'CREATE_TASK', title: 'Read' },
            output: { success: true },
          },
        ],
      },
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0].content).toBe('Proposed two changes.');
    expect(Array.isArray(inserts[0].parts)).toBe(true);
    expect((inserts[0].parts as unknown[]).length).toBe(2);
  });

  it('persists client message id when it is a valid uuid', async () => {
    const clientId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const { supabase, inserts } = createHistorySupabase({});
    await persistBrunoAssistantTurn(supabase, {
      userId: USER_ID,
      conversationId: CONV_ID,
      message: {
        id: clientId,
        parts: [{ type: 'text', text: 'Stable id reply.' }],
      },
    });
    expect(inserts[0].id).toBe(clientId);
  });

  it('uses a placeholder content when the model produced only tool calls', async () => {
    const { supabase, inserts } = createHistorySupabase({});
    await persistBrunoAssistantTurn(supabase, {
      userId: USER_ID,
      conversationId: CONV_ID,
      message: {
        parts: [
          {
            type: 'tool-propose_action',
            toolCallId: 'c2',
            state: 'output-available',
            input: {},
            output: { success: true },
          },
        ],
      },
    });
    expect(inserts).toHaveLength(1);
    expect(String(inserts[0].content)).toContain('without a text reply');
  });

  it('updates the existing row in place on approval continuations', async () => {
    const { supabase, inserts, updates } = createHistorySupabase({});
    await persistBrunoAssistantTurn(supabase, {
      userId: USER_ID,
      conversationId: CONV_ID,
      replaceRowId: 'row-1',
      message: {
        parts: [
          { type: 'text', text: 'Done — created the block.' },
          {
            type: 'tool-propose_action',
            toolCallId: 'c1',
            state: 'output-available',
            input: { type: 'CREATE_TIME_BLOCK', title: 'Study' },
            output: { success: true, executed: true },
          },
        ],
      },
    });
    expect(inserts).toHaveLength(0);
    expect(updates).toHaveLength(1);
    expect(updates[0].content).toBe('Done — created the block.');
    expect(Array.isArray(updates[0].parts)).toBe(true);
  });
});

describe('resolveAuthoritativeChatMessages with parts', () => {
  it('rehydrates assistant rows from stored parts (model-safe filter applied)', async () => {
    const { supabase } = createHistorySupabase({
      rows: [
        {
          id: 'm1',
          content: 'Plan my day',
          message_type: 'user',
          parts: null,
          created_at: '2026-07-03T10:00:00Z',
          turn_key: 'm1',
          variant_index: 0,
          is_active_variant: true,
          parent_user_message_id: null,
          superseded_at: null,
        },
        {
          id: 'm2',
          content: 'Proposed a block.',
          message_type: 'assistant',
          parts: [
            { type: 'text', text: 'Proposed a block.' },
            {
              type: 'tool-propose_action',
              toolCallId: 't1',
              state: 'output-available',
              input: { type: 'CREATE_TIME_BLOCK', title: 'Study' },
              output: { success: true, proposalId: 'p1' },
            },
            { type: 'data-bruno-action-proposals', data: {} },
          ],
          created_at: '2026-07-03T10:00:05Z',
          turn_key: null,
          variant_index: 0,
          is_active_variant: true,
          parent_user_message_id: 'm1',
          superseded_at: null,
        },
      ],
    });

    const messages = await resolveAuthoritativeChatMessages(
      supabase,
      USER_ID,
      CONV_ID,
      [{ role: 'user', content: 'Plan my day' }]
    );

    expect(messages).toHaveLength(3);
    const assistant = messages[1];
    expect(assistant.role).toBe('assistant');
    expect(assistant.parts).toHaveLength(2);
    expect(assistant.parts.map((p) => p.type)).toEqual([
      'text',
      'tool-propose_action',
    ]);
  });

  it('falls back to text for legacy rows without parts', async () => {
    const { supabase } = createHistorySupabase({
      rows: [
        {
          id: 'u1',
          content: 'Hello',
          message_type: 'user',
          parts: null,
          created_at: '2026-07-01T09:59:00Z',
          turn_key: 'u1',
          variant_index: 0,
          is_active_variant: true,
          parent_user_message_id: null,
          superseded_at: null,
        },
        {
          id: 'm1',
          content: 'Older reply',
          message_type: 'assistant',
          parts: null,
          created_at: '2026-07-01T10:00:00Z',
          turn_key: null,
          variant_index: 0,
          is_active_variant: true,
          parent_user_message_id: 'u1',
          superseded_at: null,
        },
      ],
    });

    const messages = await resolveAuthoritativeChatMessages(
      supabase,
      USER_ID,
      CONV_ID,
      []
    );
    expect(messages).toHaveLength(2);
    expect(messages[1].parts).toEqual([{ type: 'text', text: 'Older reply' }]);
  });
});
