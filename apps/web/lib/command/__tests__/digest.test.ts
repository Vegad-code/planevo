import { describe, it, expect } from 'vitest';
import { computeReentryDigest, type DigestInput } from '../digest';
import type { CommandBoard, ResponsibilityItem } from '../types';

const EMPTY_BOARD: CommandBoard = {
  now: [],
  today: [],
  dueSoon: [],
  onMyPlate: [],
  unsorted: [],
  waiting: [],
  done: [],
};

function item(id: string): ResponsibilityItem {
  return {
    id,
    title: id,
    description: null,
    type: 'assignment',
    status: 'active',
    priority: 'normal',
    urgencyScore: 0,
    confidence: 1,
    dueAt: null,
    startAt: null,
    endAt: null,
    timezone: null,
    recurrenceRule: null,
    sourceType: 'manual',
    sourceLabel: null,
    sourceItemId: null,
    calendarEventId: null,
    taskId: null,
    intakeRunId: null,
    needsReview: false,
    reviewReason: null,
    whyItMatters: null,
    metadata: {},
    completedAt: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  };
}

function base(overrides: Partial<DigestInput>): DigestInput {
  return {
    board: EMPTY_BOARD,
    eventsSinceLastVisit: [],
    newlyUrgent: [],
    movedByRollover: [],
    isFirstOpenOfDay: true,
    ...overrides,
  };
}

describe('computeReentryDigest', () => {
  it('returns null when it is not the first open of the day', () => {
    expect(computeReentryDigest(base({ isFirstOpenOfDay: false }))).toBeNull();
  });

  it('reports synced arrivals, newly urgent, and moved items in one calm line', () => {
    const result = computeReentryDigest(
      base({
        eventsSinceLastVisit: [
          { eventType: 'created', actor: 'sync', createdAt: 't' },
          { eventType: 'created', actor: 'sync', createdAt: 't' },
        ],
        newlyUrgent: [item('a')],
        movedByRollover: [item('b')],
      }),
    );
    expect(result).toBe(
      '2 things landed from your sources · 1 thing became urgent · 1 moved to today.',
    );
  });

  it('never uses punitive language for moved items', () => {
    const result = computeReentryDigest(base({ movedByRollover: [item('a'), item('b')] }));
    expect(result).toContain('moved to today');
    expect(result).not.toMatch(/overdue|behind|failed|late/i);
  });

  it('falls back to a quiet count when nothing changed but the plate is not empty', () => {
    const board = { ...EMPTY_BOARD, now: [item('a')], today: [item('b')] };
    expect(computeReentryDigest(base({ board }))).toBe('2 things on your plate today.');
  });

  it('returns null when nothing changed and the plate is empty', () => {
    expect(computeReentryDigest(base({}))).toBeNull();
  });
});
