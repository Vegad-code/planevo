import { describe, it, expect } from 'vitest';
import {
  taskPriorityToResponsibility,
  mirrorTaskToResponsibility,
  syncTaskCompletionToResponsibility,
} from '../tasks-bridge';
import type { CommandDbClient } from '../db';

/** Minimal chainable Supabase-query mock. */
function makeClient(overrides: {
  existingId?: string | null;
  insertId?: string;
  insertError?: boolean;
}) {
  const calls: { table: string; op: string }[] = [];

  const client = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => {
                      calls.push({ table, op: 'select' });
                      return { data: overrides.existingId ? { id: overrides.existingId } : null };
                    },
                  };
                },
              };
            },
          };
        },
        insert(_row: unknown) {
          calls.push({ table, op: 'insert' });
          return {
            select() {
              return {
                single: async () =>
                  overrides.insertError
                    ? { data: null, error: new Error('fail') }
                    : { data: { id: overrides.insertId ?? 'new-id' }, error: null },
              };
            },
            // For the audit-event insert (no .select()).
            then: undefined,
          } as unknown as { select: () => { single: () => Promise<unknown> } };
        },
        update() {
          calls.push({ table, op: 'update' });
          return {
            eq() {
              return {
                eq: async () => ({ error: null }),
              };
            },
          };
        },
      };
    },
    _calls: calls,
  };
  return client as unknown as CommandDbClient & { _calls: typeof calls };
}

describe('taskPriorityToResponsibility', () => {
  it('maps task priority onto the responsibility vocabulary', () => {
    expect(taskPriorityToResponsibility('high')).toBe('high');
    expect(taskPriorityToResponsibility('low')).toBe('low');
    expect(taskPriorityToResponsibility('medium')).toBe('normal');
    expect(taskPriorityToResponsibility(null)).toBe('normal');
  });
});

describe('mirrorTaskToResponsibility', () => {
  const task = {
    id: 'task-1',
    title: 'Write essay',
    description: 'due soon',
    due_date: '2026-07-10',
    estimated_minutes: 45,
    priority: 'high' as const,
    completed: false,
  };

  it('inserts a new linked responsibility when none exists', async () => {
    const client = makeClient({ existingId: null, insertId: 'resp-1' });
    const id = await mirrorTaskToResponsibility(client, 'user-1', task);
    expect(id).toBe('resp-1');
    expect(client._calls.some((c) => c.table === 'responsibility_items' && c.op === 'insert')).toBe(true);
  });

  it('updates in place when a linked responsibility already exists (idempotent)', async () => {
    const client = makeClient({ existingId: 'resp-9' });
    const id = await mirrorTaskToResponsibility(client, 'user-1', task);
    expect(id).toBe('resp-9');
    expect(client._calls.some((c) => c.op === 'update')).toBe(true);
    expect(client._calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('returns null (never throws) on insert failure', async () => {
    const client = makeClient({ existingId: null, insertError: true });
    const id = await mirrorTaskToResponsibility(client, 'user-1', task);
    expect(id).toBeNull();
  });
});

describe('syncTaskCompletionToResponsibility', () => {
  it('never throws even if the update path errors', async () => {
    const client = {
      from: () => {
        throw new Error('boom');
      },
    } as unknown as CommandDbClient;
    await expect(
      syncTaskCompletionToResponsibility(client, 'user-1', 'task-1', true),
    ).resolves.toBeUndefined();
  });
});
