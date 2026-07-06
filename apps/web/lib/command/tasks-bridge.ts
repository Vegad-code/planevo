/**
 * Planevo Command — the `tasks` ↔ `responsibility_items` bridge (§16.9).
 *
 * `responsibility_items` becomes the canonical backlog; `tasks` is bridged during
 * transition. These helpers keep the two in sync, keyed on `responsibility_items.task_id`.
 *
 * SAFETY: every call site guards on `FEATURES.PLANEVO_COMMAND` and wraps this in
 * try/catch. A bridge failure must NEVER break the shipped `tasks` write path.
 * When the Command flag is off (production default) these are inert.
 *
 * LIFECYCLE INTEGRITY (§16.9 rule 6): completion mirrors both ways, but scheduling
 * a responsibility (linking a calendar block) never marks it done — that path does
 * not live here.
 */

import type { CommandDbClient } from './db';
import type { ResponsibilityPriority } from './types';

interface BridgeableTask {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  estimated_minutes?: number | null;
  priority?: 'low' | 'medium' | 'high' | null;
  completed?: boolean | null;
}

/** Map a `tasks.priority` onto the responsibility priority vocabulary. */
export function taskPriorityToResponsibility(
  priority: 'low' | 'medium' | 'high' | null | undefined,
): ResponsibilityPriority {
  switch (priority) {
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    default:
      return 'normal';
  }
}

/**
 * Ensure a `responsibility_items` row mirrors a task, linked via `task_id`.
 * Idempotent: if a linked responsibility already exists it is updated in place,
 * never duplicated. Returns the responsibility id, or null on any failure.
 */
export async function mirrorTaskToResponsibility(
  client: CommandDbClient,
  userId: string,
  task: BridgeableTask,
): Promise<string | null> {
  try {
    const { data: existing } = await client
      .from('responsibility_items')
      .select('id')
      .eq('user_id', userId)
      .eq('task_id', task.id)
      .maybeSingle();

    const fields = {
      user_id: userId,
      title: task.title.slice(0, 160),
      description: task.description ?? null,
      due_at: task.due_date ?? null,
      priority: taskPriorityToResponsibility(task.priority),
      status: task.completed ? 'done' : 'active',
      completed_at: task.completed ? new Date().toISOString() : null,
      source_type: 'manual' as const,
      task_id: task.id,
      metadata: task.estimated_minutes ? { estimatedMinutes: task.estimated_minutes } : {},
    };

    if (existing?.id) {
      await client
        .from('responsibility_items')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .eq('user_id', userId);
      return existing.id as string;
    }

    const { data: inserted, error } = await client
      .from('responsibility_items')
      .insert(fields)
      .select('id')
      .single();
    if (error) return null;

    const id = (inserted as { id: string }).id;
    await client.from('responsibility_events').insert({
      user_id: userId,
      item_id: id,
      event_type: 'created',
      actor: 'sync',
      after: fields,
    });
    return id;
  } catch {
    return null;
  }
}

/**
 * Propagate a task's completion state to its linked responsibility (and vice
 * versa is handled by the Command PATCH path). Best-effort; never throws.
 */
export async function syncTaskCompletionToResponsibility(
  client: CommandDbClient,
  userId: string,
  taskId: string,
  completed: boolean,
): Promise<void> {
  try {
    await client
      .from('responsibility_items')
      .update({
        status: completed ? 'done' : 'active',
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('task_id', taskId);
  } catch {
    /* best-effort */
  }
}

/**
 * Backfill: mirror every open task into `responsibility_items` (§16.9 step 2).
 * Idempotent + re-runnable. Returns the number of tasks processed. Intended for
 * the Phase 12 rollout job, run per user.
 */
export async function backfillTasksToResponsibilities(
  client: CommandDbClient,
  userId: string,
): Promise<number> {
  const { data: tasks, error } = await client
    .from('tasks')
    .select('id, title, description, due_date, estimated_minutes, priority, completed')
    .eq('user_id', userId)
    .neq('completed', true);
  if (error || !tasks) return 0;

  let processed = 0;
  for (const task of tasks as BridgeableTask[]) {
    const id = await mirrorTaskToResponsibility(client, userId, task);
    if (id) processed += 1;
  }
  return processed;
}
