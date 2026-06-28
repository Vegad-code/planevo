'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import type { BestTimeOfDay, EnergyLevel, Task, TaskPriority } from '@/types/tasks';
import { toast } from 'sonner';
import { posthog } from '@/lib/posthog';
import {
  dispatchPlanevoTasksChanged,
  dispatchPlanevoTaskOptimisticAdd,
  dispatchPlanevoTaskOptimisticReconcile,
  dispatchPlanevoTaskOptimisticRevert,
} from '@/lib/client/planevo-events';
import {
  signalOptimisticMutationEnd,
  signalOptimisticMutationStart,
} from '@/hooks/useSupabaseTableRealtime';

export interface NewTaskInput {
  title: string;
  description?: string;
  estimated_minutes?: number;
  best_time_of_day?: BestTimeOfDay;
  energy_level_required?: EnergyLevel;
  due_date?: string;
  parent_task_id?: string;
  priority?: TaskPriority;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  source?: 'canvas' | 'google_calendar' | 'manual' | 'ai_suggested';
}

export interface TaskActionsOptions {
  onRefresh?: () => void;
  setTasks?: Dispatch<SetStateAction<Task[]>>;
}

function resolveOptions(options: (() => void) | TaskActionsOptions): TaskActionsOptions {
  return typeof options === 'function' ? { onRefresh: options } : options;
}

function buildOptimisticTask(userId: string, input: NewTaskInput, tempId: string): Task {
  const now = new Date().toISOString();
  return {
    id: tempId,
    user_id: userId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    estimated_minutes: input.estimated_minutes || 30,
    best_time_of_day: input.best_time_of_day || 'anytime',
    energy_level_required: input.energy_level_required || 'medium',
    parent_task_id: input.parent_task_id || null,
    priority: input.priority || 'medium',
    status: 'todo',
    completed: false,
    is_ai_suggested: input.source === 'ai_suggested',
    ai_confidence_score: 0,
    is_recurring: input.is_recurring || false,
    recurrence_pattern: input.recurrence_pattern || null,
    rescheduled_count: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    source: input.source || 'manual',
  };
}

export function useTaskActions(options: (() => void) | TaskActionsOptions) {
  const { onRefresh, setTasks } = resolveOptions(options);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const addTask = useCallback(
    async (input: NewTaskInput) => {
      setSaving(true);
      const tempId = crypto.randomUUID();
      let previousTasks: Task[] | null = null;

      try {
        const { user, error: profileError } = await ensureUserProfile(supabase);
        if (profileError || !user) {
          console.error('Auth/profile error:', profileError);
          return { error: 'Please log in again.', task: null as Task | null };
        }

        if (setTasks) {
          setTasks((prev) => {
            previousTasks = prev;
            return [buildOptimisticTask(user.id, input, tempId), ...prev];
          });
        } else {
          dispatchPlanevoTaskOptimisticAdd(buildOptimisticTask(user.id, input, tempId));
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: inserted, error } = await (supabase as any)
          .from('tasks')
          .insert({
            user_id: user.id,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            estimated_minutes: input.estimated_minutes || 30,
            best_time_of_day: input.best_time_of_day || 'anytime',
            energy_level_required: input.energy_level_required || 'medium',
            due_date: input.due_date || null,
            parent_task_id: input.parent_task_id || null,
            priority: input.priority || 'medium',
            status: 'todo',
            completed: false,
            is_ai_suggested: input.source === 'ai_suggested',
            ai_confidence_score: 0,
            is_recurring: input.is_recurring || false,
            recurrence_pattern: input.recurrence_pattern || null,
            rescheduled_count: 0,
          })
          .select('*')
          .single();

        if (error) {
          console.error('Insert error:', error);
          if (setTasks && previousTasks) {
            setTasks(previousTasks);
          } else {
            dispatchPlanevoTaskOptimisticRevert(tempId);
          }
          return { error: error.message, task: null };
        }

        if (setTasks && inserted) {
          setTasks((prev) =>
            prev.map((t) => (t.id === tempId ? (inserted as Task) : t))
          );
        } else if (inserted) {
          dispatchPlanevoTaskOptimisticReconcile(tempId, inserted as Task);
        } else {
          onRefresh?.();
        }

        dispatchPlanevoTasksChanged();
        return { error: null, task: inserted as Task };
      } catch (err) {
        console.error('Unexpected error:', err);
        if (setTasks && previousTasks) {
          setTasks(previousTasks);
        } else {
          dispatchPlanevoTaskOptimisticRevert(tempId);
        }
        return { error: 'An unexpected error occurred.', task: null };
      } finally {
        setSaving(false);
      }
    },
    [supabase, onRefresh, setTasks]
  );

  const toggleComplete = useCallback(
    async (taskId: string, currentlyCompleted: boolean) => {
      const updates = currentlyCompleted
        ? { completed: false, completed_at: null, status: 'todo' as const }
        : {
            completed: true,
            completed_at: new Date().toISOString(),
            status: 'done' as const,
          };

      let previousTasks: Task[] | null = null;

      if (setTasks) {
        setTasks((prev) => {
          previousTasks = prev;
          return prev.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          );
        });
      }

      signalOptimisticMutationStart();

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updatedTask, error: taskError } = await (supabase as any)
          .from('tasks')
          .update(updates)
          .eq('id', taskId)
          .select('id')
          .maybeSingle();

        if (taskError) {
          throw taskError;
        }

        if (!updatedTask) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: sourceError } = await (supabase as any)
            .from('source_items')
            .update(updates)
            .eq('external_id', taskId);

          if (sourceError) {
            throw sourceError;
          }
        }
      } catch (err) {
        console.error('toggleComplete error:', err);
        if (setTasks && previousTasks) {
          setTasks(previousTasks);
        }
        toast.error('Could not update task. Please try again.');
        signalOptimisticMutationEnd();
        return;
      } finally {
        signalOptimisticMutationEnd();
      }

      if (!setTasks) {
        onRefresh?.();
      }

      dispatchPlanevoTasksChanged();

      if (!currentlyCompleted) {
        posthog.capture('task_completed', { task_id: taskId });
      }

      fetch('/api/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task_completed',
          value: currentlyCompleted ? -1 : 1,
        }),
      }).catch((e) => console.error('Error tracking task metric:', e));
    },
    [supabase, onRefresh, setTasks]
  );

  const deleteTask = useCallback(
    async (taskId: string, taskTitle: string = 'Task') => {
      let previousTasks: Task[] | null = null;

      if (setTasks) {
        setTasks((prev) => {
          previousTasks = prev;
          return prev.filter((t) => t.id !== taskId);
        });
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('tasks')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', taskId);

        if (error) {
          throw error;
        }
      } catch (err) {
        console.error('deleteTask error:', err);
        if (setTasks && previousTasks) {
          setTasks(previousTasks);
        }
        toast.error('Could not delete task.');
        return;
      }

      if (!setTasks) {
        onRefresh?.();
      }

      dispatchPlanevoTasksChanged();

      toast(`Deleted "${taskTitle}"`, {
        description: 'The task has been moved to trash.',
        action: {
          label: 'Undo',
          onClick: async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('tasks')
              .update({ deleted_at: null })
              .eq('id', taskId);
            if (setTasks && previousTasks) {
              setTasks(previousTasks);
            } else {
              onRefresh?.();
            }
            dispatchPlanevoTasksChanged();
          },
        },
      });
    },
    [supabase, onRefresh, setTasks]
  );

  const restoreTask = useCallback(
    async (taskId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('tasks')
        .update({ deleted_at: null })
        .eq('id', taskId);
      onRefresh?.();
      dispatchPlanevoTasksChanged();
    },
    [supabase, onRefresh]
  );

  const permanentlyDeleteTask = useCallback(
    async (taskId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('tasks').delete().eq('id', taskId);
      if (setTasks) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        onRefresh?.();
      }
      dispatchPlanevoTasksChanged();
    },
    [supabase, onRefresh, setTasks]
  );

  const rescheduleTask = useCallback(
    async (taskId: string, newDueDate: string) => {
      if (setTasks) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, due_date: newDueDate } : t))
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedTask } = await (supabase as any)
        .from('tasks')
        .update({ due_date: newDueDate })
        .eq('id', taskId)
        .select('id')
        .maybeSingle();

      if (!updatedTask) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('source_items')
          .update({ due_date: newDueDate })
          .eq('external_id', taskId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('tasks')
        .select('rescheduled_count')
        .eq('id', taskId)
        .single();
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('tasks')
          .update({ rescheduled_count: (data.rescheduled_count || 0) + 1 })
          .eq('id', taskId);
      }

      if (!setTasks) {
        onRefresh?.();
      }
      dispatchPlanevoTasksChanged();
    },
    [supabase, onRefresh, setTasks]
  );

  const moveToWaiting = useCallback(
    async (taskId: string) => {
      if (setTasks) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, due_date: null, priority: 'low' } : t
          )
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('tasks')
        .update({ due_date: null, priority: 'low' })
        .eq('id', taskId);

      if (!setTasks) {
        onRefresh?.();
      }
      dispatchPlanevoTasksChanged();
    },
    [supabase, onRefresh, setTasks]
  );

  const breakDownTask = useCallback(async (_task: string | Task) => {
    return {
      error:
        'Ask Bruno to break this down for you in chat. (AI breakdown is now part of Bruno Chat in v1.)',
    };
  }, []);

  return {
    saving,
    addTask,
    toggleComplete,
    deleteTask,
    restoreTask,
    permanentlyDeleteTask,
    rescheduleTask,
    moveToWaiting,
    breakDownTask,
    startFresh: useCallback(async () => {
      setSaving(true);
      try {
        const { user, error: profileError } = await ensureUserProfile(supabase);
        if (profileError || !user) {
          return { error: 'Auth/profile error' };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tasksToDelete } = await (supabase as any)
          .from('tasks')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sourceItemsToDelete } = await (supabase as any)
          .from('source_items')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const taskIds = tasksToDelete?.map((t: { id: string }) => t.id) ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sourceItemIds =
          sourceItemsToDelete?.map((s: { id: string }) => s.id) ?? [];
        const totalCount = taskIds.length + sourceItemIds.length;

        if (totalCount === 0) {
          onRefresh?.();
          return { error: null };
        }

        const deletedAt = new Date().toISOString();

        if (taskIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: taskError } = await (supabase as any)
            .from('tasks')
            .update({ deleted_at: deletedAt })
            .in('id', taskIds);

          if (taskError) throw taskError;
        }

        if (sourceItemIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: sourceError } = await (supabase as any)
            .from('source_items')
            .update({ deleted_at: deletedAt })
            .in('id', sourceItemIds);

          if (sourceError) throw sourceError;
        }

        if (setTasks) {
          setTasks([]);
        } else {
          onRefresh?.();
        }

        dispatchPlanevoTasksChanged();

        toast(`Cleared ${totalCount} tasks`, {
          description: 'Your workspace is now fresh.',
          action: {
            label: 'Undo',
            onClick: async () => {
              if (taskIds.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase as any)
                  .from('tasks')
                  .update({ deleted_at: null })
                  .in('id', taskIds);
              }
              if (sourceItemIds.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase as any)
                  .from('source_items')
                  .update({ deleted_at: null })
                  .in('id', sourceItemIds);
              }
              onRefresh?.();
              dispatchPlanevoTasksChanged();
            },
          },
        });

        return { error: null };
      } catch (err: unknown) {
        console.error('Start fresh error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { error: message };
      } finally {
        setSaving(false);
      }
    }, [supabase, onRefresh, setTasks]),
  };
}
