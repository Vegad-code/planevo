import { describe, expect, it } from 'vitest';
import { buildAgendaItems, filterAgendaByDate } from '@/lib/dashboard/agenda';
import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import type { WorkItem } from '@/lib/dashboard/types';

function makeCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    user_id: 'user-1',
    title: 'Test Event',
    start_time: '2025-07-01T09:00:00Z',
    end_time: '2025-07-01T10:00:00Z',
    is_all_day: false,
    source: 'manual',
    is_completed: false,
    is_deleted: false,
    created_at: '2025-07-01T00:00:00Z',
    updated_at: '2025-07-01T00:00:00Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    title: 'Test Task',
    completed: false,
    created_at: '2025-07-01T00:00:00Z',
    updated_at: '2025-07-01T00:00:00Z',
    ...overrides,
  };
}

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'work-1',
    provider: 'linear',
    title: 'Work Item',
    ...overrides,
  };
}

describe('buildAgendaItems', () => {
  it('returns empty array for empty inputs', () => {
    expect(buildAgendaItems([], [], [])).toEqual([]);
  });

  it('includes calendar events as event-type items', () => {
    const events = [makeCalendarEvent({ id: 'e1', title: 'Meeting' })];
    const items = buildAgendaItems(events, [], []);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('event');
    expect(items[0].title).toBe('Meeting');
    expect(items[0].actionText).toBe('View');
  });

  it('uses fallback title "Event" when event title is empty', () => {
    const events = [makeCalendarEvent({ title: '' })];
    const items = buildAgendaItems(events, [], []);
    expect(items[0].title).toBe('Event');
  });

  it('includes only incomplete tasks', () => {
    const tasks = [
      makeTask({ id: 't1', title: 'Open Task', completed: false }),
      makeTask({ id: 't2', title: 'Done Task', completed: true }),
    ];
    const items = buildAgendaItems([], tasks, []);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Open Task');
    expect(items[0].type).toBe('task');
  });

  it('includes work items', () => {
    const workItems = [makeWorkItem({ id: 'w1', title: 'Fix Bug', url: 'https://example.com' })];
    const items = buildAgendaItems([], [], workItems);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('work');
    expect(items[0].actionText).toBe('Open');
  });

  it('uses "View" action for work items without URL', () => {
    const workItems = [makeWorkItem({ url: null })];
    const items = buildAgendaItems([], [], workItems);
    expect(items[0].actionText).toBe('View');
  });

  it('sorts items by date', () => {
    const events = [
      makeCalendarEvent({ id: 'e1', start_time: '2025-07-03T09:00:00Z' }),
      makeCalendarEvent({ id: 'e2', start_time: '2025-07-01T09:00:00Z' }),
    ];
    const items = buildAgendaItems(events, [], []);
    expect(items[0].id).toBe('e2');
    expect(items[1].id).toBe('e1');
  });

  it('respects the limit parameter', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      makeCalendarEvent({ id: `e${i}`, start_time: `2025-07-${String(i + 1).padStart(2, '0')}T09:00:00Z` })
    );
    const items = buildAgendaItems(events, [], [], 5);
    expect(items).toHaveLength(5);
  });

  it('defaults limit to 8', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      makeCalendarEvent({ id: `e${i}`, start_time: `2025-07-${String(i + 1).padStart(2, '0')}T09:00:00Z` })
    );
    const items = buildAgendaItems(events, [], []);
    expect(items).toHaveLength(8);
  });

  it('pushes tasks without due_date to the end', () => {
    const events = [makeCalendarEvent({ id: 'e1', start_time: '2025-07-01T09:00:00Z' })];
    const tasks = [makeTask({ id: 't1', title: 'No Due Date', due_date: null })];
    const items = buildAgendaItems(events, tasks, []);
    expect(items[items.length - 1].id).toBe('t1');
  });

  it('uses "Untitled" for work items with null title', () => {
    const workItems = [makeWorkItem({ title: null })];
    const items = buildAgendaItems([], [], workItems);
    expect(items[0].title).toBe('Untitled');
  });
});

describe('filterAgendaByDate', () => {
  it('returns empty array when no items match the date', () => {
    const items = buildAgendaItems(
      [makeCalendarEvent({ start_time: '2025-07-01T09:00:00Z' })],
      [],
      []
    );
    const farDate = new Date('2030-01-01');
    expect(filterAgendaByDate(items, farDate)).toEqual([]);
  });

  it('excludes items with FAR_FUTURE date (no due date tasks)', () => {
    const tasks = [makeTask({ due_date: null })];
    const items = buildAgendaItems([], tasks, []);
    const result = filterAgendaByDate(items, new Date());
    expect(result).toHaveLength(0);
  });

  it('includes items matching the given date', () => {
    // Derive the target from the event's own instant so the local day of the
    // filter window always matches the item's local day, regardless of the
    // runner's timezone (filterAgendaByDate builds its window from local time).
    const eventStart = '2025-07-01T14:00:00Z';
    const events = [makeCalendarEvent({ start_time: eventStart })];
    const items = buildAgendaItems(events, [], []);
    const result = filterAgendaByDate(items, new Date(eventStart));
    expect(result).toHaveLength(1);
  });
});
