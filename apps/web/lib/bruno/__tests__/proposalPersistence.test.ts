import { describe, expect, it, vi } from 'vitest';
import {
  assignProposalId,
  fingerprintProposal,
  persistBrunoProposals,
} from '@/lib/bruno/proposalPersistence';
import type { BrunoActionProposal } from '@/lib/bruno/tools/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

describe('proposalPersistence', () => {
  it('creates stable proposal fingerprints', () => {
    const id = fingerprintProposal({
      type: 'UPDATE_CALENDAR_EVENT',
      entityId: 'event-1',
      startTime: '2026-07-03T12:00:00.000Z',
      endTime: '2026-07-03T13:00:00.000Z',
      title: 'Meeting',
    });
    expect(id).toMatch(/^proposal-/);
    expect(
      fingerprintProposal({
        type: 'UPDATE_CALENDAR_EVENT',
        entityId: 'event-1',
        startTime: '2026-07-03T12:00:00.000Z',
        endTime: '2026-07-03T13:00:00.000Z',
        title: 'Meeting',
      })
    ).toBe(id);
  });

  it('assigns proposal ids from payload entity ids', () => {
    const { proposalId } = assignProposalId({
      type: 'RESCHEDULE_TASK',
      title: 'Homework',
      description: 'Move homework',
      payload: { taskId: 'task-1' },
    });
    expect(proposalId).toMatch(/^proposal-/);
  });

  it('inserts proposals and updates on duplicate key conflicts', async () => {
    const insert = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } });
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const update = vi.fn(() => ({ eq: firstEq }));
    const supabase = {
      from: vi.fn(() => ({ insert, update })),
    } as unknown as SupabaseClient<Database>;

    const proposals: BrunoActionProposal[] = [
      {
        id: 'proposal-a',
        type: 'UPDATE_CALENDAR_EVENT',
        title: 'A',
        description: 'A',
        status: 'pending_confirmation',
        riskLevel: 'low',
        requiresConfirmation: true,
        payload: { eventId: 'event-a' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'proposal-b',
        type: 'UPDATE_CALENDAR_EVENT',
        title: 'B',
        description: 'B',
        status: 'pending_confirmation',
        riskLevel: 'low',
        requiresConfirmation: true,
        payload: { eventId: 'event-b' },
        createdAt: new Date().toISOString(),
      },
    ];

    await persistBrunoProposals(supabase, 'user-1', proposals, 'test');

    expect(insert).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(1);
    expect(firstEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(secondEq).toHaveBeenCalledWith('idempotency_key', 'proposal:proposal-b');
  });
});
