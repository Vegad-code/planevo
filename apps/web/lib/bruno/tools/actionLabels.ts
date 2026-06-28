import {
  EXECUTABLE_V3_ACTION_TYPES,
  type BrunoActionTypeV3,
} from '@/lib/bruno/tools/schemas';

export function isV3ExecutableAction(type: string): type is BrunoActionTypeV3 {
  return EXECUTABLE_V3_ACTION_TYPES.has(type as BrunoActionTypeV3);
}

export function getProposalActionLabels(type: string) {
  switch (type) {
    case 'CREATE_TIME_BLOCK':
      return { confirmLabel: 'Add to calendar', executingLabel: 'Adding...', successLabel: 'Event added to calendar', errorLabel: "Couldn't add event. Try again." };
    case 'CREATE_NOTE':
    case 'UPDATE_NOTE':
    case 'APPEND_TO_NOTE':
      return { confirmLabel: 'Save note', executingLabel: 'Saving...', successLabel: 'Note saved', errorLabel: "Couldn't save note. Try again." };
    case 'ARCHIVE_NOTE':
      return { confirmLabel: 'Archive note', executingLabel: 'Archiving...', successLabel: 'Note archived', errorLabel: "Couldn't archive note. Try again." };
    case 'DELETE_CALENDAR_EVENT':
      return { confirmLabel: 'Delete event', executingLabel: 'Deleting...', successLabel: 'Event deleted', errorLabel: "Couldn't delete event. Try again." };
    case 'DELETE_TASK':
      return { confirmLabel: 'Remove task', executingLabel: 'Removing...', successLabel: 'Task removed', errorLabel: "Couldn't remove task. Try again." };
    case 'UPDATE_TASK':
    case 'RESCHEDULE_TASK':
      return { confirmLabel: 'Update task', executingLabel: 'Updating...', successLabel: 'Task updated', errorLabel: "Couldn't update task. Try again." };
    case 'UPDATE_DAILY_PLAN':
      return { confirmLabel: 'Update plan', executingLabel: 'Updating...', successLabel: 'Daily plan updated', errorLabel: "Couldn't update plan. Try again." };
    default:
      return { confirmLabel: 'Confirm', executingLabel: 'Creating...', successLabel: 'Task created', errorLabel: "Couldn't create task. Try again." };
  }
}

export function getPostExecuteRefreshTargets(type: string) {
  return {
    refreshDashboard: ['CREATE_TASK', 'UPDATE_TASK', 'RESCHEDULE_TASK', 'DELETE_TASK', 'CREATE_TIME_BLOCK', 'DELETE_CALENDAR_EVENT', 'UPDATE_DAILY_PLAN'].includes(type),
    emitNoteUpdated: ['CREATE_NOTE', 'UPDATE_NOTE', 'APPEND_TO_NOTE', 'ARCHIVE_NOTE'].includes(type),
  };
}
