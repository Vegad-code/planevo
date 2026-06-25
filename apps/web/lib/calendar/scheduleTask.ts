import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '@/types/tasks';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Resolve a backlog item to a tasks-table UUID for linked_task_id FK. */
export async function resolveTaskIdForSchedule(
  supabase: SupabaseClient,
  task: Task,
  userId: string
): Promise<string> {
  if (UUID_RE.test(task.id)) {
    return task.id;
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: task.title,
      description: task.description || null,
      estimated_minutes: task.estimated_minutes || 30,
      due_date: task.due_date || null,
      status: 'todo',
      completed: false,
      priority: 'medium',
      energy_level_required: task.energy_level_required || 'medium',
      best_time_of_day: 'anytime',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create task for scheduling');
  }

  return data.id;
}
