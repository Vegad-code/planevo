import { describe, it, expect } from 'vitest';
import {
  computeBoardSections,
  computeUrgencyScore,
  isDecayedOverdue,
  summarizeBoard,
  NOW_SECTION_CAP,
} from '../board';
import type { ResponsibilityItem } from '../types';

const TZ = 'America/New_York';
// A fixed reference instant: 2026-07-04 12:00:00 in New York (16:00Z).
const NOW = new Date('2026-07-04T16:00:00.000Z');

function make(overrides: Partial<ResponsibilityItem> = {}): ResponsibilityItem {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    title: 'Item',
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
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
}

/** Hours from NOW → ISO string. */
function hoursFromNow(h: number): string {
  return new Date(NOW.getTime() + h * 36e5).toISOString();
}

describe('computeUrgencyScore', () => {
  it('scores priority without a due date', () => {
    expect(computeUrgencyScore(make({ priority: 'urgent' }), NOW)).toBe(40);
    expect(computeUrgencyScore(make({ priority: 'high' }), NOW)).toBe(25);
    expect(computeUrgencyScore(make({ priority: 'normal' }), NOW)).toBe(0);
  });

  it('adds needs-review weight', () => {
    expect(computeUrgencyScore(make({ needsReview: true }), NOW)).toBe(10);
  });

  it('gives the full overdue bonus only within the first 48h', () => {
    const fresh = make({ dueAt: hoursFromNow(-10) }); // 10h overdue
    const decayed = make({ dueAt: hoursFromNow(-72) }); // 72h overdue
    expect(computeUrgencyScore(fresh, NOW)).toBe(50);
    // Decayed scores as "due soon" (+20), not +50.
    expect(computeUrgencyScore(decayed, NOW)).toBe(20);
  });

  it('escalates by proximity to the due date', () => {
    expect(computeUrgencyScore(make({ dueAt: hoursFromNow(12) }), NOW)).toBe(35);
    expect(computeUrgencyScore(make({ dueAt: hoursFromNow(48) }), NOW)).toBe(20);
    expect(computeUrgencyScore(make({ dueAt: hoursFromNow(120) }), NOW)).toBe(10);
    expect(computeUrgencyScore(make({ dueAt: hoursFromNow(400) }), NOW)).toBe(0);
  });

  it('caps at 100', () => {
    const item = make({ priority: 'urgent', needsReview: true, dueAt: hoursFromNow(-1) });
    expect(computeUrgencyScore(item, NOW)).toBe(Math.min(40 + 10 + 50, 100));
  });
});

describe('isDecayedOverdue', () => {
  it('is false for not-yet-due and freshly overdue items', () => {
    expect(isDecayedOverdue(make({ dueAt: hoursFromNow(5) }), NOW)).toBe(false);
    expect(isDecayedOverdue(make({ dueAt: hoursFromNow(-10) }), NOW)).toBe(false);
    expect(isDecayedOverdue(make({ dueAt: null }), NOW)).toBe(false);
  });
  it('is true at or past 48h overdue', () => {
    expect(isDecayedOverdue(make({ dueAt: hoursFromNow(-48) }), NOW)).toBe(true);
    expect(isDecayedOverdue(make({ dueAt: hoursFromNow(-100) }), NOW)).toBe(true);
  });
});

describe('computeBoardSections', () => {
  it('routes lifecycle statuses first', () => {
    const board = computeBoardSections(
      [
        make({ id: 'd', status: 'done', completedAt: hoursFromNow(-1) }),
        make({ id: 'w', status: 'waiting' }),
      ],
      NOW,
      TZ,
    );
    expect(board.done.map((i) => i.id)).toEqual(['d']);
    expect(board.waiting.map((i) => i.id)).toEqual(['w']);
  });

  it('places needs-review and anchor-less unknowns in unsorted', () => {
    const board = computeBoardSections(
      [
        make({ id: 'r', needsReview: true }),
        make({ id: 'u', type: 'unknown', dueAt: null, startAt: null }),
      ],
      NOW,
      TZ,
    );
    expect(board.unsorted.map((i) => i.id).sort()).toEqual(['r', 'u']);
  });

  it('places due-within-24h and freshly-overdue items in Now', () => {
    const board = computeBoardSections(
      [
        make({ id: 'soon', dueAt: hoursFromNow(6) }),
        make({ id: 'over', dueAt: hoursFromNow(-6) }),
      ],
      NOW,
      TZ,
    );
    expect(board.now.map((i) => i.id).sort()).toEqual(['over', 'soon']);
  });

  it('decays ≥48h overdue items out of Now into On My Plate', () => {
    const board = computeBoardSections([make({ id: 'old', dueAt: hoursFromNow(-72) })], NOW, TZ);
    expect(board.now).toHaveLength(0);
    expect(board.onMyPlate.map((i) => i.id)).toEqual(['old']);
  });

  it('separates today, due-soon, and later', () => {
    const board = computeBoardSections(
      [
        // A calendar commitment scheduled later today (NY) — not due within 24h,
        // so it belongs to Today, not Now.
        make({
          id: 'today',
          type: 'class',
          dueAt: null,
          startAt: new Date('2026-07-04T22:00:00.000Z').toISOString(),
          calendarEventId: 'cal-1',
        }),
        make({ id: 'week', dueAt: hoursFromNow(96) }), // ~4 days
        make({ id: 'later', dueAt: hoursFromNow(24 * 20) }), // 20 days
      ],
      NOW,
      TZ,
    );
    expect(board.today.map((i) => i.id)).toContain('today');
    expect(board.dueSoon.map((i) => i.id)).toContain('week');
    expect(board.onMyPlate.map((i) => i.id)).toContain('later');
  });

  it('honors metadata.pinnedSection', () => {
    const board = computeBoardSections(
      [make({ id: 'pin', dueAt: hoursFromNow(24 * 30), metadata: { pinnedSection: 'now' } })],
      NOW,
      TZ,
    );
    expect(board.now.map((i) => i.id)).toEqual(['pin']);
  });

  it('places high/urgent no-due items in Now and normal no-due items on the plate', () => {
    const board = computeBoardSections(
      [
        make({ id: 'hi', priority: 'high', dueAt: null }),
        make({ id: 'plate', priority: 'normal', dueAt: null }),
      ],
      NOW,
      TZ,
    );
    expect(board.now.map((i) => i.id)).toEqual(['hi']);
    expect(board.onMyPlate.map((i) => i.id)).toEqual(['plate']);
  });

  it('caps Now and spills urgency-ordered overflow into Today', () => {
    const items = Array.from({ length: NOW_SECTION_CAP + 3 }, (_, i) =>
      // All due within 24h so all land in Now; vary hours so urgency/tiebreak orders them.
      make({ id: `n${i}`, dueAt: hoursFromNow(1 + i) }),
    );
    const board = computeBoardSections(items, NOW, TZ);
    expect(board.now).toHaveLength(NOW_SECTION_CAP);
    expect(board.today).toHaveLength(3);
    // Overflow items are the least urgent of the Now candidates.
    const nowIds = new Set(board.now.map((i) => i.id));
    for (const t of board.today) expect(nowIds.has(t.id)).toBe(false);
  });

  it('returns a fully empty board for no items', () => {
    const board = computeBoardSections([], NOW, TZ);
    expect(summarizeBoard(board)).toEqual({
      nowCount: 0,
      todayCount: 0,
      dueSoonCount: 0,
      unsortedCount: 0,
    });
  });
});

describe('summarizeBoard', () => {
  it('counts the four headline sections', () => {
    const board = computeBoardSections(
      [
        make({ id: 'a', dueAt: hoursFromNow(2) }),
        make({ id: 'b', needsReview: true }),
      ],
      NOW,
      TZ,
    );
    const s = summarizeBoard(board);
    expect(s.nowCount).toBe(1);
    expect(s.unsortedCount).toBe(1);
  });
});
