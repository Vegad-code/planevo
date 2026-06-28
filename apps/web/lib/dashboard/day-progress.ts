import type { CalendarEvent } from '@/types/calendar';
import type { Task } from '@/types/tasks';
import { getAllTasksDueOnDate, getBlocksForDate } from '@/lib/dashboard/home-preview';
import type { ParsedScheduleBlock } from '@/lib/dashboard/types';

export interface DayCompletionStats {
  percent: number;
  completedCount: number;
  totalCount: number;
  blockCount: number;
  taskCount: number;
  label: string;
}

type PlanBlock = ParsedScheduleBlock & { is_completed?: boolean };

export function isPlanItemDone(block: PlanBlock): boolean {
  return block.is_completed === true || block.status === 'confirmed';
}

export function getDayCompletionStats(
  date: Date,
  parsedSchedule: ParsedScheduleBlock[] | null,
  events: CalendarEvent[],
  tasks: Task[],
): DayCompletionStats {
  const blocks = getBlocksForDate(date, parsedSchedule, events) as PlanBlock[];
  const dueTasks = getAllTasksDueOnDate(tasks, date);

  const completedBlocks = blocks.filter(isPlanItemDone).length;
  const completedTasks = dueTasks.filter((t) => t.completed).length;

  const blockCount = blocks.length;
  const taskCount = dueTasks.length;
  const totalCount = blockCount + taskCount;
  const completedCount = completedBlocks + completedTasks;

  const percent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  let label: string;
  if (totalCount === 0) {
    label = 'No items scheduled';
  } else if (completedCount === totalCount) {
    label = `All ${totalCount} item${totalCount === 1 ? '' : 's'} done`;
  } else {
    label = `${completedCount} of ${totalCount} item${totalCount === 1 ? '' : 's'} done`;
  }

  return {
    percent,
    completedCount,
    totalCount,
    blockCount,
    taskCount,
    label,
  };
}
