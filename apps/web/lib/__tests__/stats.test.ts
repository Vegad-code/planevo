import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateMomentumStats,
  getWeeklyFocusSeries,
  calculateUserStats,
  type DailyMetric,
} from '@/lib/stats';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

describe('calculateMomentumStats', () => {
  it('returns zeroed stats when no metrics match today', () => {
    const result = calculateMomentumStats([], 0, 5);
    expect(result).toEqual({
      focusTimeMinutes: 0,
      tasksCrushed: 0,
      tasksPlanned: 5,
      upcomingDeadlines: 0,
      consistencyPercent: 0,
    });
  });

  it('extracts today focus time and tasks from matching metric', () => {
    const metrics: DailyMetric[] = [
      { date: todayISO(), focus_time_seconds: 5400, tasks_completed: 3, tasks_planned: 10 },
    ];
    const result = calculateMomentumStats(metrics, 2, 8);
    expect(result.focusTimeMinutes).toBe(90);
    expect(result.tasksCrushed).toBe(3);
    expect(result.tasksPlanned).toBe(8);
    expect(result.upcomingDeadlines).toBe(2);
  });

  it('rounds focus time to nearest minute', () => {
    const metrics: DailyMetric[] = [
      { date: todayISO(), focus_time_seconds: 125, tasks_completed: 0, tasks_planned: 0 },
    ];
    const result = calculateMomentumStats(metrics, 0, 0);
    expect(result.focusTimeMinutes).toBe(2); // 125/60 = 2.08 → rounds to 2
  });

  it('calculates consistency from active days', () => {
    const metrics: DailyMetric[] = [
      { date: daysAgo(0), focus_time_seconds: 100, tasks_completed: 0, tasks_planned: 0 },
      { date: daysAgo(1), focus_time_seconds: 0, tasks_completed: 1, tasks_planned: 1 },
      { date: daysAgo(2), focus_time_seconds: 0, tasks_completed: 0, tasks_planned: 0 },
      { date: daysAgo(3), focus_time_seconds: 300, tasks_completed: 2, tasks_planned: 3 },
    ];
    const result = calculateMomentumStats(metrics, 0, 0);
    // 3 active days out of 7
    expect(result.consistencyPercent).toBe(43);
  });

  it('returns 100% consistency when all 7 days are active', () => {
    const metrics: DailyMetric[] = Array.from({ length: 7 }, (_, i) => ({
      date: daysAgo(i),
      focus_time_seconds: 60,
      tasks_completed: 1,
      tasks_planned: 1,
    }));
    const result = calculateMomentumStats(metrics, 0, 0);
    expect(result.consistencyPercent).toBe(100);
  });

  it('ignores inactive days in consistency calculation', () => {
    const metrics: DailyMetric[] = [
      { date: daysAgo(0), focus_time_seconds: 0, tasks_completed: 0, tasks_planned: 5 },
    ];
    const result = calculateMomentumStats(metrics, 0, 5);
    expect(result.consistencyPercent).toBe(0);
  });
});

describe('getWeeklyFocusSeries', () => {
  it('returns 7 data points', () => {
    const series = getWeeklyFocusSeries([]);
    expect(series).toHaveLength(7);
  });

  it('returns 0 minutes for days with no matching metric', () => {
    const series = getWeeklyFocusSeries([]);
    for (const point of series) {
      expect(point.minutes).toBe(0);
    }
  });

  it('maps matching metrics to correct minute values', () => {
    const metrics: DailyMetric[] = [
      { date: todayISO(), focus_time_seconds: 3600, tasks_completed: 0, tasks_planned: 0 },
    ];
    const series = getWeeklyFocusSeries(metrics);
    const todayPoint = series[series.length - 1];
    expect(todayPoint.minutes).toBe(60);
    expect(todayPoint.date).toBe(todayISO());
  });

  it('labels each point with the correct day abbreviation', () => {
    const series = getWeeklyFocusSeries([]);
    const validLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const point of series) {
      expect(validLabels).toContain(point.label);
    }
  });
});

describe('calculateUserStats (legacy)', () => {
  let dateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dateSpy = vi.spyOn(Date.prototype, 'toLocaleDateString');
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('returns zeroed stats for empty task list', () => {
    const result = calculateUserStats([]);
    expect(result).toEqual({
      currentStreak: 0,
      consistencyScore: 0,
      totalCompleted: 0,
    });
  });

  it('returns zeroed stats when no tasks are completed', () => {
    const result = calculateUserStats([{ completed: false }]);
    expect(result).toEqual({
      currentStreak: 0,
      consistencyScore: 0,
      totalCompleted: 0,
    });
  });

  it('counts total completed tasks', () => {
    const now = new Date();
    const tasks = [
      { completed: true, completed_at: now.toISOString() },
      { completed: true, completed_at: now.toISOString() },
      { completed: false },
    ];
    const result = calculateUserStats(tasks);
    expect(result.totalCompleted).toBe(2);
  });

  it('computes streak of 1 when only today has completions', () => {
    const now = new Date();
    const tasks = [
      { completed: true, completed_at: now.toISOString() },
    ];
    const result = calculateUserStats(tasks);
    expect(result.currentStreak).toBe(1);
  });

  it('computes streak across consecutive days', () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const tasks = [
      { completed: true, completed_at: today.toISOString() },
      { completed: true, completed_at: yesterday.toISOString() },
    ];
    const result = calculateUserStats(tasks);
    expect(result.currentStreak).toBe(2);
  });

  it('breaks streak when there is a gap', () => {
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);

    const tasks = [
      { completed: true, completed_at: today.toISOString() },
      { completed: true, completed_at: threeDaysAgo.toISOString() },
    ];
    const result = calculateUserStats(tasks);
    expect(result.currentStreak).toBe(1);
  });
});
