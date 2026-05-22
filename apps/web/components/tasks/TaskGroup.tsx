'use client';

import React from 'react';
import type { TaskGroup as TaskGroupType, Task } from '@/types/tasks';
import TaskCard from './TaskCard';

interface TaskGroupProps {
  group: TaskGroupType;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  onReschedule: (taskId: string) => void;
  onBreakDown?: (taskId: string) => void;
  onMoveToWaiting?: (taskId: string) => void;
  onFocus?: (task: Task) => void;
  showCompletionToast?: (message: string) => void;
}

export default function TaskGroup({
  group,
  onToggleComplete,
  onDelete,
  onReschedule,
  onBreakDown,
  onMoveToWaiting,
  onFocus,
  showCompletionToast,
}: TaskGroupProps) {
  const totalCount = group.tasks.length;

  // Mockup style right-side monospace descriptions
  const getRightLabel = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes('today')) return 'BRUNO SCHEDULED THESE';
    if (lower.includes('week')) return 'DUE IN NEXT 7 DAYS';
    if (lower.includes('waiting') || lower.includes('backlog')) return 'BACKLOG / NO RUSH';
    if (lower.includes('completed')) return 'COMPLETED RECENTLY';
    return 'DUE LATER';
  };

  const rightLabel = getRightLabel(group.title);

  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-[20px] mb-6 shadow-sm relative z-10">
      {/* Flat Card Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-line)] bg-[var(--color-cream)]/10 select-none rounded-t-[19px]">
        <div className="flex items-center gap-2">
          {/* Serif title styling with italic emphasis */}
          <h3 className="font-serif text-[19px] text-[var(--color-ink)] font-semibold italic capitalize leading-none pt-0.5">
            {group.title}
          </h3>
          <span className="font-mono text-[10px] text-[var(--color-ink-soft)] bg-[var(--color-cream)]/30 border border-[var(--color-line)] px-1.5 py-0.5 rounded-[4px] ml-1.5 leading-none">
            {totalCount}
          </span>
        </div>
        <div className="font-mono text-[10px] tracking-wider text-[var(--color-ink-soft)]/60 uppercase">
          {rightLabel}
        </div>
      </div>

      {/* Task List (separated by borders inside TaskCard) */}
      <div className="divide-y divide-[var(--color-line)] bg-transparent rounded-b-[19px]">
        {totalCount > 0 ? (
          group.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              onReschedule={onReschedule}
              onBreakDown={onBreakDown}
              onMoveToWaiting={onMoveToWaiting}
              onFocus={onFocus}
              showCompletionToast={showCompletionToast}
            />
          ))
        ) : (
          <div className="p-6 text-center text-xs text-[var(--color-ink-soft)]/50 font-mono rounded-b-[19px]">
            No tasks listed under this section.
          </div>
        )}
      </div>
    </div>
  );
}
