'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import type { BestTimeOfDay, EnergyLevel, Task, TaskPriority } from '@/types/tasks';
import { toast } from 'sonner';
import { posthog } from '@/lib/posthog';

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

export function useTaskActions(onRefresh: () => void) {
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // Create a new task
  const addTask = useCallback(async (input: NewTaskInput) => {
    setSaving(true);
    try {
      const { user, error: profileError } = await ensureUserProfile(supabase);
      if (profileError || !user) {
        console.error('Auth/profile error:', profileError);
        return { error: 'Please log in again.' };
      }

      const { error } = await (supabase as any).from('tasks').insert({
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
      });

      if (error) {
        console.error('Insert error:', error);
        return { error: error.message };
      }

      onRefresh();
      return { error: null };
    } catch (err) {
      console.error('Unexpected error:', err);
      return { error: 'An unexpected error occurred.' };
    } finally {
      setSaving(false);
    }
  }, [supabase, onRefresh]);

  // Complete / uncomplete a task
  const toggleComplete = useCallback(async (taskId: string, currentlyCompleted: boolean) => {
    const updates = currentlyCompleted
      ? { completed: false, completed_at: null, status: 'todo' }
      : { completed: true, completed_at: new Date().toISOString(), status: 'done' };


    await (supabase as any)
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (!currentlyCompleted) {
      posthog.capture('task_completed', { task_id: taskId });
    }

    onRefresh();
  }, [supabase, onRefresh]);

  // Soft delete a task
  const deleteTask = useCallback(async (taskId: string, taskTitle: string = 'Task') => {
    await (supabase as any)
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);
    onRefresh();
    
    toast(`Deleted "${taskTitle}"`, {
      description: 'The task has been moved to trash.',
      action: {
        label: 'Undo',
        onClick: async () => {
          await (supabase as any)
            .from('tasks')
            .update({ deleted_at: null })
            .eq('id', taskId);
          onRefresh();
        }
      }
    });
  }, [supabase, onRefresh]);

  // Restore a soft-deleted task
  const restoreTask = useCallback(async (taskId: string) => {
    await (supabase as any)
      .from('tasks')
      .update({ deleted_at: null })
      .eq('id', taskId);
    onRefresh();
  }, [supabase, onRefresh]);

  // Permanently delete a task
  const permanentlyDeleteTask = useCallback(async (taskId: string) => {
    await (supabase as any).from('tasks').delete().eq('id', taskId);
    onRefresh();
  }, [supabase, onRefresh]);

  // Reschedule a task to a new due date
  const rescheduleTask = useCallback(async (taskId: string, newDueDate: string) => {
    await (supabase as any)
      .from('tasks')
      .update({ due_date: newDueDate })
      .eq('id', taskId);

    // Increment rescheduled_count via raw SQL approach — use RPC or just re-fetch
    // For now, simple update approach:
    const { data } = await (supabase as any).from('tasks').select('rescheduled_count').eq('id', taskId).single();
    if (data) {
      await (supabase as any)
        .from('tasks')
        .update({ rescheduled_count: (data.rescheduled_count || 0) + 1 })
        .eq('id', taskId);
    }

    onRefresh();
  }, [supabase, onRefresh]);

  // Move to waiting (just remove due date to de-prioritize)
  const moveToWaiting = useCallback(async (taskId: string) => {
    await (supabase as any)
      .from('tasks')
      .update({ due_date: null, priority: 'low' })
      .eq('id', taskId);

    onRefresh();
  }, [supabase, onRefresh]);

  // Break down a task — folded into Bruno Chat in v1 (see STRATEGY.md §6).
  // The standalone /api/ai/breakdown endpoint is archived. Users now ask
  // Bruno directly: "Break down [task name] into 15-minute steps."
  // TODO (Block G): re-wire this to the new Bruno agent's `breakdown` tool call.
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
        if (profileError || !user) return { error: 'Auth/profile error' };

        // 1) Fetch tasks that are about to be cleared so we can undo
        const { data: tasksToDelete } = await (supabase as any)
          .from('tasks')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null);

        if (!tasksToDelete || tasksToDelete.length === 0) {
          onRefresh();
          return { error: null };
        }

        const taskIds = tasksToDelete.map((t: any) => t.id);

        // 2) Soft delete them
        const { error } = await (supabase as any)
          .from('tasks')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', taskIds);

        if (error) throw error;

        onRefresh();

        // 3) Show undo toast
        toast(`Cleared ${taskIds.length} tasks`, {
          description: 'Your workspace is now fresh.',
          action: {
            label: 'Undo',
            onClick: async () => {
              await (supabase as any)
                .from('tasks')
                .update({ deleted_at: null })
                .in('id', taskIds);
              onRefresh();
            }
          }
        });

        return { error: null };
      } catch (err: unknown) {
        console.error('Start fresh error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { error: message };
      } finally {
        setSaving(false);
      }
    }, [supabase, onRefresh]),
  };
}
