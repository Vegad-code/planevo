'use client';

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Task } from '@/types/tasks';

/** Subscribes to global quick-capture optimistic task events when list state is local. */
export function useTaskOptimisticEvents(setTasks: Dispatch<SetStateAction<Task[]>>) {
  useEffect(() => {
    const onAdd = (event: Event) => {
      const task = (event as CustomEvent<Task>).detail;
      if (!task) return;
      setTasks((prev) => [task, ...prev]);
    };

    const onReconcile = (event: Event) => {
      const { tempId, task } = (event as CustomEvent<{ tempId: string; task: Task }>).detail;
      if (!tempId || !task) return;
      setTasks((prev) => prev.map((t) => (t.id === tempId ? task : t)));
    };

    const onRevert = (event: Event) => {
      const { tempId } = (event as CustomEvent<{ tempId: string }>).detail;
      if (!tempId) return;
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
    };

    window.addEventListener('planevo:task-optimistic-add', onAdd);
    window.addEventListener('planevo:task-optimistic-reconcile', onReconcile);
    window.addEventListener('planevo:task-optimistic-revert', onRevert);

    return () => {
      window.removeEventListener('planevo:task-optimistic-add', onAdd);
      window.removeEventListener('planevo:task-optimistic-reconcile', onReconcile);
      window.removeEventListener('planevo:task-optimistic-revert', onRevert);
    };
  }, [setTasks]);
}
