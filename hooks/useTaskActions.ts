'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import type { BestTimeOfDay, EnergyLevel, Task } from '@/types/database';

export interface NewTaskInput {
  title: string;
  description?: string;
  estimated_minutes?: number;
  best_time_of_day?: BestTimeOfDay;
  energy_level_required?: EnergyLevel;
  due_date?: string;
  parent_task_id?: string;
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

      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        estimated_minutes: input.estimated_minutes || 30,
        best_time_of_day: input.best_time_of_day || 'anytime',
        energy_level_required: input.energy_level_required || 'medium',
        due_date: input.due_date || null,
        parent_task_id: input.parent_task_id || null,
        priority: 'medium',
        status: 'todo',
        completed: false,
        is_ai_suggested: false,
        ai_confidence_score: 0,
        is_recurring: false,
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


    await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    onRefresh();
  }, [supabase, onRefresh]);

  // Soft delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);
    onRefresh();
  }, [supabase, onRefresh]);

  // Restore a soft-deleted task
  const restoreTask = useCallback(async (taskId: string) => {
    await supabase
      .from('tasks')
      .update({ deleted_at: null })
      .eq('id', taskId);
    onRefresh();
  }, [supabase, onRefresh]);

  // Permanently delete a task
  const permanentlyDeleteTask = useCallback(async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    onRefresh();
  }, [supabase, onRefresh]);

  // Reschedule a task to a new due date
  const rescheduleTask = useCallback(async (taskId: string, newDueDate: string) => {
    await supabase
      .from('tasks')
      .update({ due_date: newDueDate })
      .eq('id', taskId);

    // Increment rescheduled_count via raw SQL approach — use RPC or just re-fetch
    // For now, simple update approach:
    const { data } = await supabase.from('tasks').select('rescheduled_count').eq('id', taskId).single();
    if (data) {
      await supabase
        .from('tasks')
        .update({ rescheduled_count: (data.rescheduled_count || 0) + 1 })
        .eq('id', taskId);
    }

    onRefresh();
  }, [supabase, onRefresh]);

  // Move to waiting (just remove due date to de-prioritize)
  const moveToWaiting = useCallback(async (taskId: string) => {
    await supabase
      .from('tasks')
      .update({ due_date: null, priority: 'low' })
      .eq('id', taskId);

    onRefresh();
  }, [supabase, onRefresh]);

  // Break down a task via AI
  const breakDownTask = useCallback(async (task: Task) => {
    setSaving(true);
    try {
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title, description: task.description }),
      });

      if (!res.ok) throw new Error('Failed to break down task');

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.subtasks && Array.isArray(data.subtasks)) {
        for (const sub of data.subtasks) {
          await addTask({
            title: sub.title,
            estimated_minutes: sub.estimated_minutes,
            parent_task_id: task.id,
            best_time_of_day: (task.best_time_of_day as BestTimeOfDay) || undefined,
            due_date: task.due_date || undefined,
          });
        }
      }
      return { error: null };
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to break down task';
      return { error: message };
    } finally {
      setSaving(false);
    }
  }, [addTask]);

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

        const { error } = await supabase.from('tasks').delete().eq('user_id', user.id);
        if (error) throw error;

        onRefresh();
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
