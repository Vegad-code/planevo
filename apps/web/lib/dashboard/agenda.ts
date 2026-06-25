import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import type { AgendaItem, WorkItem } from './types';

const FAR_FUTURE = new Date(8640000000000000);

export function buildAgendaItems(
  thisWeekEvents: CalendarEvent[],
  tasks: Task[],
  workItems: WorkItem[],
  limit = 8
): AgendaItem[] {
  const items: AgendaItem[] = [];

  for (const e of thisWeekEvents) {
    items.push({
      id: e.id,
      type: 'event',
      title: e.title || 'Event',
      description: e.description || '',
      date: new Date(e.start_time),
      actionText: 'View',
      raw: e,
    });
  }

  const openTasks = tasks.filter((t) => !t.completed);
  for (const t of openTasks) {
    items.push({
      id: t.id,
      type: 'task',
      title: t.title,
      description: t.description || '',
      date: t.due_date ? new Date(t.due_date) : FAR_FUTURE,
      actionText: 'View',
      raw: t,
    });
  }

  for (const w of workItems) {
    items.push({
      id: w.id,
      type: 'work',
      provider: w.provider,
      title: w.title || 'Untitled',
      description: w.description || '',
      date: w.due_date ? new Date(w.due_date) : FAR_FUTURE,
      actionText: w.url ? 'Open' : 'View',
      raw: w,
    });
  }

  items.sort((a, b) => a.date.getTime() - b.date.getTime());
  return items.slice(0, limit);
}

export function filterAgendaByDate(items: AgendaItem[], date: Date): AgendaItem[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return items.filter((item) => {
    if (item.date.getTime() === FAR_FUTURE.getTime()) return false;
    return item.date >= dayStart && item.date <= dayEnd;
  });
}
