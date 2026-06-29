'use client';

import { toast } from 'sonner';
import type { Task } from '@/types/tasks';

export function showTaskCreatedUndoToast(
  task: Task,
  onUndo: (taskId: string) => void | Promise<void>
): void {
  const summary = task.due_date
    ? `Created "${task.title}" · due ${formatDueLabel(task.due_date)}`
    : `Created "${task.title}"`;

  toast.success(summary, {
    duration: 5000,
    action: {
      label: 'Undo',
      onClick: () => {
        void onUndo(task.id);
      },
    },
  });
}

function formatDueLabel(dueDate: string): string {
  if (dueDate.length === 10) return dueDate;
  const date = new Date(dueDate);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
