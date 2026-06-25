import { describe, expect, it } from 'vitest';
import {
  getComingUpItems,
  getDueOnDateTasks,
  getOverdueTasks,
  getRemainingBlocks,
} from '@/lib/dashboard/home-preview';
import type { Task } from '@/types/tasks';
import type { ParsedScheduleBlock } from '@/lib/dashboard/types';

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    user_id: 'u1',
    completed: false,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('getOverdueTasks', () => {
  it('returns incomplete tasks past due', () => {
    const now = new Date('2026-06-22T12:00:00');
    const tasks = [
      makeTask({ id: '1', title: 'Late', due_date: '2026-06-20T10:00:00Z' }),
      makeTask({ id: '2', title: 'Future', due_date: '2026-06-25T10:00:00Z' }),
      makeTask({ id: '3', title: 'Done', due_date: '2026-06-20T10:00:00Z', completed: true }),
    ];
    const overdue = getOverdueTasks(tasks, now);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('1');
  });
});

describe('getDueOnDateTasks', () => {
  it('returns tasks due on the given date only', () => {
    const date = new Date('2026-06-22T15:00:00');
    const tasks = [
      makeTask({ id: '1', title: 'Today', due_date: '2026-06-22T18:00:00Z' }),
      makeTask({ id: '2', title: 'Tomorrow', due_date: '2026-06-23T18:00:00Z' }),
    ];
    const dueToday = getDueOnDateTasks(tasks, date);
    expect(dueToday).toHaveLength(1);
    expect(dueToday[0].id).toBe('1');
  });
});

describe('getRemainingBlocks', () => {
  it('filters blocks that have not ended yet', () => {
    const now = new Date('2026-06-22T12:00:00');
    const blocks: ParsedScheduleBlock[] = [
      {
        id: 'a',
        title: 'Past',
        time: '09:00',
        duration: 60,
        type: 'focus',
        description: '',
        startTime: new Date('2026-06-22T09:00:00'),
        endTime: new Date('2026-06-22T10:00:00'),
      },
      {
        id: 'b',
        title: 'Future',
        time: '14:00',
        duration: 60,
        type: 'focus',
        description: '',
        startTime: new Date('2026-06-22T14:00:00'),
        endTime: new Date('2026-06-22T15:00:00'),
      },
    ];
    const remaining = getRemainingBlocks(blocks, now);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('b');
  });
});

describe('getComingUpItems', () => {
  const reference = new Date('2026-06-22T12:00:00');

  it('excludes today and returns future items sorted', () => {
    const items = getComingUpItems({
      tasks: [
        makeTask({ id: '1', title: 'Today task', due_date: '2026-06-22T18:00:00Z' }),
        makeTask({ id: '2', title: 'Wed task', due_date: '2026-06-24T18:00:00Z' }),
      ],
      events: [],
      canvasAssignments: [],
      workItems: [],
      reference,
    });
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Wed task');
  });

  it('returns empty for no future items', () => {
    expect(
      getComingUpItems({
        tasks: [],
        events: [],
        canvasAssignments: [],
        workItems: [],
        reference,
      })
    ).toEqual([]);
  });
});
