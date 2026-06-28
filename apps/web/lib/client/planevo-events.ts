/** Client-side invalidation events for Supabase-backed pages that skip RSC cache. */

import type { Task } from '@/types/tasks';

export function dispatchPlanevoTasksChanged(detail?: unknown): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('planevo:tasks-changed', { detail }));
}

export function dispatchPlanevoCalendarEventsChanged(detail?: unknown): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('planevo:calendar-events-changed', { detail }));
}

export function dispatchPlanevoTaskOptimisticAdd(task: Task): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('planevo:task-optimistic-add', { detail: task }));
}

export function dispatchPlanevoTaskOptimisticReconcile(tempId: string, task: Task): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('planevo:task-optimistic-reconcile', { detail: { tempId, task } })
  );
}

export function dispatchPlanevoTaskOptimisticRevert(tempId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('planevo:task-optimistic-revert', { detail: { tempId } })
  );
}
