'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isSameDay } from 'date-fns';
import type { Task } from '@/types/tasks';
import type { ParsedScheduleBlock } from '@/lib/dashboard/types';
import type { DashboardMode } from '@/lib/dashboard/types';
import {
  blockToPreviewItem,
  getBlocksForDate,
  getDueOnDateTasks,
  getOverdueTasks,
  getRemainingBlocks,
  taskToPreviewItem,
} from '@/lib/dashboard/home-preview';
import type { CalendarEvent } from '@/types/calendar';
import { PreviewItemRow } from './PreviewItemRow';

interface TodayPreviewCardProps {
  selectedDate: Date;
  tasks: Task[];
  parsedSchedule: ParsedScheduleBlock[] | null;
  weekEvents: CalendarEvent[];
  mode: DashboardMode;
  onViewTask: (task: Task) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] text-(--color-ink-soft) tracking-[0.16em] uppercase mb-2 mt-4 first:mt-0">
      {children}
    </div>
  );
}

export function TodayPreviewCard({
  selectedDate,
  tasks,
  parsedSchedule,
  weekEvents,
  mode,
  onViewTask,
  onToggleComplete,
}: TodayPreviewCardProps) {
  const router = useRouter();
  const now = new Date();
  const isSelectedToday = isSameDay(selectedDate, now);

  const dayBlocks = useMemo(
    () => getBlocksForDate(selectedDate, parsedSchedule, weekEvents),
    [selectedDate, parsedSchedule, weekEvents]
  );

  const overdue = useMemo(
    () => (isSelectedToday ? getOverdueTasks(tasks, now) : []),
    [tasks, now, isSelectedToday]
  );
  const dueOnDate = useMemo(
    () => getDueOnDateTasks(tasks, selectedDate),
    [tasks, selectedDate]
  );
  const scheduled = useMemo(
    () => (isSelectedToday ? getRemainingBlocks(dayBlocks, now) : dayBlocks),
    [dayBlocks, now, isSelectedToday]
  );

  const hasContent = overdue.length > 0 || dueOnDate.length > 0 || scheduled.length > 0;
  const dateLabel = isSelectedToday ? 'Today' : format(selectedDate, 'EEEE');

  return (
    <div className="bg-(--color-paper) rounded-[22px] p-6 border border-line shadow-sm min-w-0 h-full flex flex-col">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono text-[11px] text-(--color-ink-soft) tracking-[0.16em] mb-1.5">
            {dateLabel.toUpperCase()}
          </div>
          <div className="font-serif text-[22px] text-(--color-ink)">
            Your <em>to-dos.</em>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/tasks')}
          className="font-mono text-[11px] tracking-wide text-(--color-honey-deep) hover:text-(--color-honey) cursor-pointer bg-transparent border-none"
        >
          All tasks &rarr;
        </button>
      </div>

      {!hasContent ? (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <p className="font-serif text-lg text-(--color-ink-soft) m-0 mb-4">
            {mode === 'caught_up'
              ? 'Nothing scheduled for this day.'
              : 'No tasks or blocks yet for this day.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/daily-plan')}
            className="bg-(--color-honey) text-(--color-ink) px-5 py-2.5 rounded-full text-sm font-medium hover:bg-(--color-honey-soft) transition-colors cursor-pointer"
          >
            {mode === 'needs_plan' ? 'Generate your plan' : 'Open daily plan'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {overdue.length > 0 && (
            <>
              <SectionLabel>Overdue</SectionLabel>
              {overdue.map((task) => (
                <PreviewItemRow
                  key={task.id}
                  item={taskToPreviewItem(task)}
                  metaLabel={task.due_date ? format(new Date(task.due_date), 'MMM d · h:mm a') : undefined}
                  showCheckbox
                  onToggleComplete={() => onToggleComplete(task.id, task.completed)}
                  onPress={() => onViewTask(task)}
                />
              ))}
            </>
          )}

          {dueOnDate.length > 0 && (
            <>
              <SectionLabel>{isSelectedToday ? 'Due today' : 'Due this day'}</SectionLabel>
              {dueOnDate.map((task) => (
                <PreviewItemRow
                  key={task.id}
                  item={taskToPreviewItem(task)}
                  metaLabel={
                    task.due_date ? format(new Date(task.due_date), 'h:mm a') : undefined
                  }
                  showCheckbox
                  onToggleComplete={() => onToggleComplete(task.id, task.completed)}
                  onPress={() => onViewTask(task)}
                />
              ))}
            </>
          )}

          {scheduled.length > 0 && (
            <>
              <SectionLabel>Scheduled</SectionLabel>
              {scheduled.map((block) => {
                const isNow = now >= block.startTime && now < block.endTime;
                return (
                  <PreviewItemRow
                    key={block.id}
                    item={blockToPreviewItem(block)}
                    metaLabel={
                      isNow
                        ? `NOW · ${format(block.startTime, 'h:mm a')}`
                        : format(block.startTime, 'h:mm a')
                    }
                    isActive={isNow}
                    onPress={() => {
                      if (block.id) {
                        router.push(`/dashboard/deep-work?taskId=${block.id}`);
                      }
                    }}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
