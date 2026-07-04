import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { reserveBrunoExecution } from '@/lib/bruno/executeReservation';

function createBuilder(options: {
  single?: unknown;
  maybeSingle?: unknown;
} = {}) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  Object.assign(builder, {
    insert: vi.fn(chain),
    select: vi.fn(chain),
    eq: vi.fn(chain),
    update: vi.fn(chain),
    single: vi.fn(async () => options.single ?? { data: null, error: null }),
    maybeSingle: vi.fn(async () => options.maybeSingle ?? { data: null, error: null }),
  });

  return builder;
}

function queueSupabase(builders: Array<Record<string, unknown>>) {
  const queue = [...builders];
  return {
    from: vi.fn(() => {
      const next = queue.shift();
      if (!next) throw new Error('Unexpected Supabase query');
      return next;
    }),
  } as unknown as SupabaseClient;
}

describe('reserveBrunoExecution', () => {
  it('retries stale pending execution reservations', async () => {
    const reservation = createBuilder({
      single: { data: null, error: { code: '23505', message: 'duplicate' } },
    });
    const existing = createBuilder({
      maybeSingle: {
        data: {
          id: 'execute-log-1',
          result: { status: 'pending' },
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        },
        error: null,
      },
    });
    const retryUpdate = createBuilder();
    const supabase = queueSupabase([reservation, existing, retryUpdate]);

    const result = await reserveBrunoExecution({
      supabase,
      userId: 'user-1',
      proposalId: 'proposal-1',
      actionType: 'UPDATE_TASK',
      loggedPayload: { taskId: 'task-1' },
    });

    expect(result).toEqual({
      kind: 'retry',
      executionLogId: 'execute-log-1',
    });
    expect(retryUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        result: { status: 'executing' },
      })
    );
  });

  it('keeps fresh executing reservations in flight', async () => {
    const reservation = createBuilder({
      single: { data: null, error: { code: '23505', message: 'duplicate' } },
    });
    const existing = createBuilder({
      maybeSingle: {
        data: {
          id: 'execute-log-1',
          result: { status: 'executing' },
          created_at: new Date().toISOString(),
        },
        error: null,
      },
    });
    const supabase = queueSupabase([reservation, existing]);

    const result = await reserveBrunoExecution({
      supabase,
      userId: 'user-1',
      proposalId: 'proposal-1',
      actionType: 'UPDATE_TASK',
      loggedPayload: { taskId: 'task-1' },
    });

    expect(result).toEqual({ kind: 'in_flight' });
  });
});
