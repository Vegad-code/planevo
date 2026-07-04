import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UIMessage } from 'ai';
import type { Database } from '@/types/database';
import {
  BRUNO_APPROVAL_TTL_MS,
  executeApprovedBrunoAction,
  extractClientApprovalResponses,
  graftApprovalsIntoParts,
  loadPendingApprovalState,
  looksLikeApprovalContinuation,
  stripUnresolvedApprovalParts,
  validateApprovalResponses,
  type PendingApprovalState,
} from '@/lib/bruno/agentLoop';

vi.mock('@/lib/bruno/executeAction', () => ({
  executeAction: vi.fn(),
  logExecuteActionAudit: vi.fn(),
}));
vi.mock('@/lib/bruno/executeReservation', () => ({
  reserveBrunoExecution: vi.fn(),
  finalizeBrunoExecution: vi.fn(),
}));
vi.mock('@/lib/bruno/proposalPersistence', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/bruno/proposalPersistence')>();
  return {
    ...actual,
    persistBrunoProposals: vi.fn(),
  };
});

import { executeAction } from '@/lib/bruno/executeAction';
import { reserveBrunoExecution } from '@/lib/bruno/executeReservation';

const APPROVAL_PART = {
  type: 'tool-propose_action',
  toolCallId: 'call-1',
  state: 'approval-requested',
  input: { type: 'CREATE_TASK', title: 'Read ch. 4' },
  approval: { id: 'appr-1' },
};

function assistantMessage(parts: unknown[]) {
  return { role: 'assistant', parts };
}

describe('extractClientApprovalResponses', () => {
  it('reads {approvalId, approved} pairs from the trailing assistant message', () => {
    const responses = extractClientApprovalResponses([
      { role: 'user', parts: [{ type: 'text', text: 'do it' }] },
      assistantMessage([
        { type: 'text', text: 'Proposed.' },
        {
          ...APPROVAL_PART,
          state: 'approval-responded',
          approval: { id: 'appr-1', approved: true },
        },
      ]),
    ]);
    expect(responses).toEqual([{ approvalId: 'appr-1', approved: true }]);
  });

  it('ignores approval parts that are not on the last message', () => {
    const responses = extractClientApprovalResponses([
      assistantMessage([
        {
          ...APPROVAL_PART,
          state: 'approval-responded',
          approval: { id: 'appr-1', approved: true },
        },
      ]),
      { role: 'user', parts: [{ type: 'text', text: 'and this too' }] },
    ]);
    expect(responses).toEqual([]);
  });

  it('ignores pending requests, malformed approvals, and duplicates', () => {
    const responses = extractClientApprovalResponses([
      assistantMessage([
        APPROVAL_PART, // still approval-requested
        {
          ...APPROVAL_PART,
          state: 'approval-responded',
          approval: { id: 'appr-2', approved: 'yes' }, // non-boolean
        },
        {
          ...APPROVAL_PART,
          state: 'approval-responded',
          approval: { id: 'appr-3', approved: false },
        },
        {
          ...APPROVAL_PART,
          state: 'approval-responded',
          approval: { id: 'appr-3', approved: true }, // duplicate id
        },
      ]),
    ]);
    expect(responses).toEqual([{ approvalId: 'appr-3', approved: false }]);
    expect(
      looksLikeApprovalContinuation([
        assistantMessage([APPROVAL_PART]),
      ])
    ).toBe(false);
  });
});

describe('validateApprovalResponses', () => {
  const state: PendingApprovalState = {
    rowId: 'row-1',
    createdAt: new Date('2026-07-04T10:00:00Z').toISOString(),
    parts: [APPROVAL_PART],
    pending: new Map([
      ['appr-1', { toolCallId: 'call-1', toolName: 'propose_action' }],
    ]),
  };
  const now = new Date('2026-07-04T11:00:00Z').getTime();

  it('accepts only responses that match a persisted pending approval', () => {
    const validated = validateApprovalResponses(
      state,
      [
        { approvalId: 'appr-1', approved: true },
        { approvalId: 'forged', approved: true },
      ],
      now
    );
    expect(validated).toEqual([
      {
        approvalId: 'appr-1',
        approved: true,
        toolCallId: 'call-1',
        toolName: 'propose_action',
      },
    ]);
  });

  it('rejects everything past the TTL', () => {
    const validated = validateApprovalResponses(
      state,
      [{ approvalId: 'appr-1', approved: true }],
      now + BRUNO_APPROVAL_TTL_MS + 1
    );
    expect(validated).toEqual([]);
  });
});

describe('graftApprovalsIntoParts / stripUnresolvedApprovalParts', () => {
  it('marks matched requests as responded and leaves the rest pending', () => {
    const parts = [
      { type: 'text', text: 'Two cards.' },
      APPROVAL_PART,
      {
        ...APPROVAL_PART,
        toolCallId: 'call-2',
        approval: { id: 'appr-2' },
      },
    ];
    const grafted = graftApprovalsIntoParts(parts, [
      {
        approvalId: 'appr-2',
        approved: false,
        toolCallId: 'call-2',
        toolName: 'propose_action',
      },
    ]) as Array<Record<string, unknown>>;

    expect(grafted[1].state).toBe('approval-requested');
    expect(grafted[2].state).toBe('approval-responded');
    expect(grafted[2].approval).toEqual({ id: 'appr-2', approved: false });
  });

  it('strips still-pending approval requests from model-bound messages', () => {
    const messages = [
      {
        id: 'm1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'hello' },
          APPROVAL_PART,
          {
            ...APPROVAL_PART,
            toolCallId: 'call-2',
            state: 'approval-responded',
            approval: { id: 'appr-2', approved: true },
          },
        ],
      },
    ] as unknown as UIMessage[];

    const stripped = stripUnresolvedApprovalParts(messages);
    expect(stripped[0].parts.map((p) => (p as { type: string }).type)).toEqual([
      'text',
      'tool-propose_action',
    ]);
    expect(
      (stripped[0].parts[1] as unknown as Record<string, unknown>).state
    ).toBe('approval-responded');
  });
});

describe('loadPendingApprovalState', () => {
  function supabaseWithLastRow(row: Record<string, unknown> | null) {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ data: row ? [row] : [] }),
      })),
    };
    return { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
  }

  it('returns pending approvals from the newest assistant row', async () => {
    const state = await loadPendingApprovalState(
      supabaseWithLastRow({
        id: 'row-9',
        message_type: 'assistant',
        parts: [APPROVAL_PART],
        created_at: '2026-07-04T10:00:00Z',
      }),
      'user-1',
      'conv-1'
    );
    expect(state?.rowId).toBe('row-9');
    expect(state?.pending.get('appr-1')).toEqual({
      toolCallId: 'call-1',
      toolName: 'propose_action',
    });
  });

  it('returns null when the newest row is a user turn (stale cards)', async () => {
    const state = await loadPendingApprovalState(
      supabaseWithLastRow({
        id: 'row-9',
        message_type: 'user',
        parts: null,
        created_at: '2026-07-04T10:00:00Z',
      }),
      'user-1',
      'conv-1'
    );
    expect(state).toBeNull();
  });
});

describe('executeApprovedBrunoAction', () => {
  const supabase = {} as unknown as SupabaseClient<Database>;
  const baseInput = {
    supabase,
    userId: 'user-1',
    source: 'llm_propose_action',
    timeZone: 'America/New_York',
    dataAccess: {
      tasks: true,
      calendar: true,
      notes: true,
      canvas: true,
      integrations: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuses when the privacy gate blocks the action domain', async () => {
    const result = await executeApprovedBrunoAction({
      ...baseInput,
      dataAccess: { ...baseInput.dataAccess, tasks: false },
      args: {
        type: 'CREATE_TASK',
        title: 'Read',
        description: 'Read ch. 4',
        payload: { taskTitle: 'Read' },
      },
    });
    expect(result.success).toBe(false);
    expect(result.executed).toBe(false);
    expect(result.error).toContain('Task access is disabled');
    expect(reserveBrunoExecution).not.toHaveBeenCalled();
  });

  it('short-circuits on an already-executed reservation', async () => {
    vi.mocked(reserveBrunoExecution).mockResolvedValue({
      kind: 'already_executed',
      data: { taskId: 't-1' },
    });
    const result = await executeApprovedBrunoAction({
      ...baseInput,
      args: {
        type: 'CREATE_TASK',
        title: 'Read',
        description: 'Read ch. 4',
        payload: { taskTitle: 'Read' },
      },
    });
    expect(result).toMatchObject({
      success: true,
      executed: true,
      duplicate: true,
    });
    expect(executeAction).not.toHaveBeenCalled();
  });

  it('executes a reserved action and reports the structured outcome', async () => {
    vi.mocked(reserveBrunoExecution).mockResolvedValue({
      kind: 'reserved',
      executionLogId: 'log-1',
    });
    vi.mocked(executeAction).mockResolvedValue({
      success: true,
      data: { taskId: 'task-9' },
    });

    const result = await executeApprovedBrunoAction({
      ...baseInput,
      args: {
        type: 'CREATE_TASK',
        title: 'Read ch. 4',
        description: 'Add a reading task',
        payload: { taskTitle: 'Read ch. 4' },
      },
    });

    expect(result.success).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.data).toEqual({ taskId: 'task-9' });
    expect(executeAction).toHaveBeenCalledTimes(1);
  });

  it('surfaces execution failures without throwing', async () => {
    vi.mocked(reserveBrunoExecution).mockResolvedValue({
      kind: 'reserved',
      executionLogId: 'log-1',
    });
    vi.mocked(executeAction).mockResolvedValue({
      success: false,
      error: 'Event not found',
    });

    const result = await executeApprovedBrunoAction({
      ...baseInput,
      args: {
        type: 'DELETE_CALENDAR_EVENT',
        title: 'Delete gym',
        description: 'Remove the gym block',
        riskLevel: 'high',
        requiresConfirmation: true,
        payload: { eventId: '3e2c9c1e-6a10-4b7e-9c40-2f2f8f4a5b6c' },
      },
    });

    expect(result.success).toBe(false);
    expect(result.executed).toBe(true);
    expect(result.error).toBe('Event not found');
  });
});
