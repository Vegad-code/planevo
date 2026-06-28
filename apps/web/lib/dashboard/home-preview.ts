import {
  endOfDay,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  startOfDay,
} from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import type { ParsedScheduleBlock, WorkItem } from './types';

export interface CanvasAssignmentPreview {
  id: string;
  name: string;
  course_name: string | null;
  due_at: string | null;
  html_url: string | null;
}

export type PreviewItemKind = 'task' | 'block' | 'canvas' | 'event' | 'work';

export interface PreviewItem {
  id: string;
  kind: PreviewItemKind;
  title: string;
  subtitle?: string;
  date: Date;
  provider?: string;
  raw: Task | ParsedScheduleBlock | CanvasAssignmentPreview | CalendarEvent | WorkItem;
}

function dayBounds(date: Date) {
  return { start: startOfDay(date), end: endOfDay(date) };
}

export function getOverdueTasks(tasks: Task[], now = new Date()): Task[] {
  return tasks
    .filter((t) => {
      if (t.completed || !t.due_date) return false;
      return new Date(t.due_date) < now;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
}

export function getDueOnDateTasks(tasks: Task[], date: Date): Task[] {
  const { start, end } = dayBounds(date);
  return tasks
    .filter((t) => {
      if (t.completed || !t.due_date) return false;
      const due = new Date(t.due_date);
      return due >= start && due <= end;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
}

/** All tasks with a due date on `date`, including completed (for progress stats). */
export function getAllTasksDueOnDate(tasks: Task[], date: Date): Task[] {
  const { start, end } = dayBounds(date);
  return tasks
    .filter((t) => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      return due >= start && due <= end;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
}

export function getRemainingBlocks(
  blocks: ParsedScheduleBlock[],
  now = new Date()
): ParsedScheduleBlock[] {
  return blocks
    .filter((b) => b.endTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export function getBlocksForDate(
  date: Date,
  todayBlocks: ParsedScheduleBlock[] | null,
  weekEvents: CalendarEvent[]
): ParsedScheduleBlock[] {
  const { start, end } = dayBounds(date);

  if (isSameDay(date, new Date()) && todayBlocks?.length) {
    return [...todayBlocks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  return weekEvents
    .filter((e) => {
      const startTime = new Date(e.start_time);
      return startTime >= start && startTime <= end;
    })
    .map((e) => {
      const startTime = new Date(e.start_time);
      const endTime = e.end_time
        ? new Date(e.end_time)
        : new Date(startTime.getTime() + 30 * 60000);
      return {
        id: e.id,
        title: e.title,
        time: format(startTime, 'HH:mm'),
        duration: Math.round((endTime.getTime() - startTime.getTime()) / 60000),
        type: e.energy_level === 'low' ? ('break' as const) : ('focus' as const),
        description: e.description || '',
        startTime,
        endTime,
      };
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export function formatDueLabel(date: Date, reference = new Date()): string {
  if (isToday(date)) return format(date, 'h:mm a');
  if (isTomorrow(date)) return `Tomorrow · ${format(date, 'h:mm a')}`;
  const diffDays = Math.ceil(
    (startOfDay(date).getTime() - startOfDay(reference).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays > 0 && diffDays <= 7) {
    return `${format(date, 'EEE')} · ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d · h:mm a');
}

function isAfterToday(date: Date, reference = new Date()): boolean {
  return startOfDay(date).getTime() > startOfDay(reference).getTime();
}

export interface ComingUpInput {
  tasks: Task[];
  events: CalendarEvent[];
  canvasAssignments: CanvasAssignmentPreview[];
  workItems: WorkItem[];
  reference?: Date;
  limit?: number;
}

export function getComingUpItems({
  tasks,
  events,
  canvasAssignments,
  workItems,
  reference = new Date(),
  limit = 8,
}: ComingUpInput): PreviewItem[] {
  const items: PreviewItem[] = [];

  for (const t of tasks) {
    if (t.completed || !t.due_date) continue;
    const due = new Date(t.due_date);
    if (!isAfterToday(due, reference)) continue;
    items.push({
      id: `task-${t.id}`,
      kind: 'task',
      title: t.title,
      subtitle: t.source === 'canvas' ? 'Canvas' : 'Task',
      date: due,
      raw: t,
    });
  }

  for (const e of events) {
    const start = new Date(e.start_time);
    if (!isAfterToday(start, reference)) continue;
    items.push({
      id: `event-${e.id}`,
      kind: 'event',
      title: e.title || 'Event',
      subtitle: 'Calendar',
      date: start,
      raw: e,
    });
  }

  for (const c of canvasAssignments) {
    if (!c.due_at) continue;
    const due = new Date(c.due_at);
    if (!isAfterToday(due, reference)) continue;
    items.push({
      id: `canvas-${c.id}`,
      kind: 'canvas',
      title: c.name,
      subtitle: c.course_name || 'Canvas',
      date: due,
      raw: c,
    });
  }

  for (const w of workItems) {
    if (w.completed || !w.due_date) continue;
    const due = new Date(w.due_date);
    if (!isAfterToday(due, reference)) continue;
    items.push({
      id: `work-${w.id}`,
      kind: 'work',
      title: w.title || 'Untitled',
      subtitle: w.provider,
      date: due,
      provider: w.provider,
      raw: w,
    });
  }

  items.sort((a, b) => a.date.getTime() - b.date.getTime());
  return items.slice(0, limit);
}

export function taskToPreviewItem(task: Task): PreviewItem {
  return {
    id: `task-${task.id}`,
    kind: 'task',
    title: task.title,
    subtitle: task.source === 'canvas' ? 'Canvas' : 'Task',
    date: task.due_date ? new Date(task.due_date) : new Date(),
    raw: task,
  };
}

export function blockToPreviewItem(block: ParsedScheduleBlock): PreviewItem {
  return {
    id: `block-${block.id}`,
    kind: 'block',
    title: block.title,
    subtitle: `${format(block.startTime, 'h:mm a')} · ${Math.round(
      (block.endTime.getTime() - block.startTime.getTime()) / 60000
    )}m`,
    date: block.startTime,
    raw: block,
  };
}
