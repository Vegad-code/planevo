import { describe, expect, it } from 'vitest';
import { inferEnergyLevel } from '@/lib/plan/infer-energy';
import { buildDayPlanSnapshot, hasLockedPlanToday } from '@/lib/plan/day-plan';
import type { Tables } from '@/types/database';

describe('inferEnergyLevel', () => {
  it('returns high during morning preference hours', () => {
    expect(inferEnergyLevel('morning', 9)).toBe('high');
  });

  it('returns low during late night', () => {
    expect(inferEnergyLevel('morning', 23)).toBe('low');
  });

  it('returns medium during off-peak afternoon for morning people', () => {
    expect(inferEnergyLevel('morning', 15)).toBe('medium');
  });
});

describe('buildDayPlanSnapshot', () => {
  const baseRow = {
    id: 'block-1',
    user_id: 'user-1',
    title: 'Study block',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60_000).toISOString(),
    description: null,
    linked_task_id: 'task-1',
    source: 'schedule',
    is_ai_suggested: true,
    status: 'pending',
    energy_level: 'medium',
    metadata: { reason: 'Due tomorrow' },
    is_deleted: false,
  } as unknown as Tables<'calendar_events'>;

  it('identifies pending AI blocks', () => {
    const snapshot = buildDayPlanSnapshot([baseRow]);
    expect(snapshot.pendingCount).toBe(1);
    expect(snapshot.blocks[0].reason).toBe('Due tomorrow');
  });
});

describe('hasLockedPlanToday', () => {
  it('returns true when accepted AI blocks exist', () => {
    const rows = [
      {
        is_ai_suggested: true,
        status: 'accepted',
        is_deleted: false,
      },
    ] as Tables<'calendar_events'>[];

    expect(hasLockedPlanToday(rows)).toBe(true);
  });
});
