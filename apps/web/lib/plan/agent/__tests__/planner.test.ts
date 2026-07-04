import { describe, expect, it } from 'vitest';
import { buildDeterministicDailyPlan } from '../planner';
import type { DailyPlanCandidateItem, FixedScheduleBlock } from '../types';

const date = '2026-07-03';
const dayStart = '2026-07-03T15:00:00.000Z';
const dayEnd = '2026-07-04T01:00:00.000Z';

function candidate(
  overrides: Partial<DailyPlanCandidateItem> = {}
): DailyPlanCandidateItem {
  return {
    id: overrides.id ?? 'task:one',
    rawSourceId: overrides.rawSourceId ?? 'one',
    source: overrides.source ?? 'task',
    title: overrides.title ?? 'Important task',
    description: overrides.description ?? null,
    dueAt: overrides.dueAt ?? '2026-07-03T23:00:00.000Z',
    startAt: overrides.startAt ?? null,
    endAt: overrides.endAt ?? null,
    estimatedMinutes: overrides.estimatedMinutes ?? 60,
    priority: overrides.priority ?? 'medium',
    status: overrides.status ?? 'todo',
    url: overrides.url ?? null,
    confidenceSignals: overrides.confidenceSignals ?? ['native_task'],
  };
}

function fixed(
  startTime: string,
  endTime: string,
  title = 'Meeting'
): FixedScheduleBlock {
  return {
    id: `event:${startTime}`,
    title,
    startTime,
    endTime,
    source: 'google_calendar',
  };
}

describe('buildDeterministicDailyPlan', () => {
  it('prioritizes deadline and urgency, then places work around fixed events', () => {
    const result = buildDeterministicDailyPlan({
      localDate: date,
      dayStart,
      dayEnd,
      now: '2026-07-03T15:00:00.000Z',
      candidates: [
        candidate({
          id: 'linear:later',
          title: 'Later Linear issue',
          source: 'linear',
          priority: 'low',
          dueAt: '2026-07-09T23:00:00.000Z',
        }),
        candidate({
          id: 'canvas:today',
          title: 'Submit lab',
          source: 'canvas',
          priority: 'high',
          dueAt: '2026-07-03T21:00:00.000Z',
        }),
      ],
      fixedBlocks: [fixed('2026-07-03T16:00:00.000Z', '2026-07-03T17:00:00.000Z')],
      preferredFocusWindow: 'morning',
      bufferMinutes: 10,
    });

    expect(result.blocks[0]).toMatchObject({
      candidateId: 'canvas:today',
      title: 'Submit lab',
      startTime: '2026-07-03T15:00:00.000Z',
      endTime: '2026-07-03T16:00:00.000Z',
      source: 'canvas',
    });
    expect(result.blocks[0].confidenceFactors).toEqual(
      expect.arrayContaining(['due today', 'high priority'])
    );
    expect(result.blocks.some((block) => block.title === 'Later Linear issue')).toBe(true);
    expect(result.capacity.fixedMinutes).toBe(60);
  });

  it('adds a buffer when a focus block starts soon after a meeting', () => {
    const result = buildDeterministicDailyPlan({
      localDate: date,
      dayStart,
      dayEnd: '2026-07-03T19:00:00.000Z',
      now: dayStart,
      candidates: [
        candidate({
          id: 'task:after-meeting',
          title: 'Write follow-up',
          estimatedMinutes: 30,
        }),
      ],
      fixedBlocks: [fixed('2026-07-03T15:00:00.000Z', '2026-07-03T16:00:00.000Z')],
      preferredFocusWindow: 'afternoon',
      bufferMinutes: 10,
    });

    expect(result.blocks[0]).toMatchObject({
      type: 'buffer',
      title: 'Meeting buffer',
      startTime: '2026-07-03T16:00:00.000Z',
      endTime: '2026-07-03T16:10:00.000Z',
    });
    expect(result.blocks[1]).toMatchObject({
      candidateId: 'task:after-meeting',
      startTime: '2026-07-03T16:10:00.000Z',
    });
  });

  it('reports overflow when work cannot fit in available gaps', () => {
    const result = buildDeterministicDailyPlan({
      localDate: date,
      dayStart,
      dayEnd: '2026-07-03T17:00:00.000Z',
      now: dayStart,
      candidates: [
        candidate({ id: 'task:big', title: 'Large task', estimatedMinutes: 180 }),
      ],
      fixedBlocks: [fixed('2026-07-03T16:00:00.000Z', '2026-07-03T17:00:00.000Z')],
      preferredFocusWindow: 'morning',
      bufferMinutes: 10,
    });

    expect(result.blocks).toEqual([]);
    expect(result.overflowItems).toEqual([
      expect.objectContaining({
        candidateId: 'task:big',
        reason: 'No open focus window could fit 180 minutes.',
      }),
    ]);
    expect(result.capacity.status).toBe('healthy');
  });

  it('does not create overlapping draft blocks', () => {
    const result = buildDeterministicDailyPlan({
      localDate: date,
      dayStart,
      dayEnd,
      now: dayStart,
      candidates: [
        candidate({ id: 'task:a', title: 'A', estimatedMinutes: 45 }),
        candidate({ id: 'task:b', title: 'B', estimatedMinutes: 45 }),
        candidate({ id: 'task:c', title: 'C', estimatedMinutes: 45 }),
      ],
      fixedBlocks: [fixed('2026-07-03T17:00:00.000Z', '2026-07-03T18:00:00.000Z')],
      preferredFocusWindow: 'morning',
      bufferMinutes: 10,
    });

    const ordered = [...result.blocks].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    for (let i = 1; i < ordered.length; i += 1) {
      expect(new Date(ordered[i].startTime).getTime()).toBeGreaterThanOrEqual(
        new Date(ordered[i - 1].endTime).getTime()
      );
    }
  });
});
