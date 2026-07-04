import type { BrunoDataAccess } from '@/lib/bruno/types';

const TASK_ACTIONS = new Set([
  'CREATE_TASK',
  'UPDATE_TASK',
  'RESCHEDULE_TASK',
  'DELETE_TASK',
]);

const CALENDAR_ACTIONS = new Set([
  'CREATE_TIME_BLOCK',
  'UPDATE_CALENDAR_EVENT',
  'DELETE_CALENDAR_EVENT',
  'UPDATE_DAILY_PLAN',
]);

/**
 * Per-domain privacy gate for a single action type. Returns a user-facing
 * error when the user has disabled Bruno's access to that domain.
 */
export function actionAccessError(
  actionType: string,
  access: BrunoDataAccess
): string | null {
  if (TASK_ACTIONS.has(actionType) && !access.tasks) {
    return 'Task access is disabled for Bruno. Enable Task Access in Settings > Bruno Preferences, then ask Bruno again.';
  }

  if (CALENDAR_ACTIONS.has(actionType) && !access.calendar) {
    return 'Calendar access is disabled for Bruno. Enable Calendar Access in Settings > Bruno Preferences, then ask Bruno again.';
  }

  return null;
}

/**
 * Gate an action including every step of an APPLY_PLAN — a plan is only
 * executable if all of its steps pass the same per-domain check.
 */
export function actionAccessErrorDeep(
  actionType: string,
  payload: Record<string, unknown> | undefined,
  access: BrunoDataAccess
): string | null {
  const direct = actionAccessError(actionType, access);
  if (direct) return direct;

  if (actionType === 'APPLY_PLAN') {
    const steps = Array.isArray(payload?.steps)
      ? (payload.steps as Array<Record<string, unknown>>)
      : [];
    for (const step of steps) {
      const stepError =
        typeof step?.type === 'string'
          ? actionAccessError(step.type, access)
          : null;
      if (stepError) return stepError;
    }
  }

  return null;
}
