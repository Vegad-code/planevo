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
  lastRow?: { message_type: string; content: string } | null;
  rows?: Array<Record<string, unknown>>;
}) {
  const inserts: Array<Record<string, unknown>> = [];
  const table = {
    select: vi.fn(() => table),
    eq: vi.fn(() => table),
    order: vi.fn((column: string, opts?: { ascending?: boolean }) => {
      if (opts?.ascending === false) {
        return {
          limit: vi.fn().mockResolvedValue({
            data: options.lastRow ? [options.lastRow] : [],
            error: null,
          }),
        };
      }
      return Promise.resolve({ data: options.rows ?? [], error: null });
    }),
    insert: vi.fn((row: Record<string, unknown>) => {
      inserts.push(row);
      return Promise.resolve({ data: null, error: null });
    }),
  };
  return {
    supabase: { from: vi.fn(() => table) } as unknown as SupabaseClient<Database>,
    inserts,
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
    await persistBrunoUserTurn(supabase, {
      userId: USER_ID,
      conversationId: CONV_ID,
      text: 'Plan my day',
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      message_type: 'user',
      content: 'Plan my day',
      conversation_id: CONV_ID,
    });
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
          id: 'm1',
          content: 'Older reply',
          message_type: 'assistant',
          parts: null,
          created_at: '2026-07-01T10:00:00Z',
        },
      ],
    });

    const messages = await resolveAuthoritativeChatMessages(
      supabase,
      USER_ID,
      CONV_ID,
      []
    );
    expect(messages).toHaveLength(1);
    expect(messages[0].parts).toEqual([{ type: 'text', text: 'Older reply' }]);
  });
});
