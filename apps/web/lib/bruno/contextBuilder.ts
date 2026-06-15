import type { BrunoModelPolicy } from './types';

export type BrunoTaskContextRow = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  priority: string | null;
  estimatedMinutes: number | null;
};

export type BrunoCalendarContextRow = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string | null;
};

export type BrunoCanvasContextRow = {
  id: string;
  name: string;
  courseName: string | null;
  dueAt: string | null;
  description: string | null;
  htmlUrl: string | null;
};

export type BrunoContextLoaders = {
  loadTasks: (userId: string) => Promise<BrunoTaskContextRow[]>;
  loadCalendar: (userId: string) => Promise<BrunoCalendarContextRow[]>;
  loadCanvas: (
    userId: string,
    assignmentId?: string
  ) => Promise<BrunoCanvasContextRow[]>;
};

export async function buildBrunoContext(
  input: {
    userId: string;
    policy: BrunoModelPolicy;
    assignmentId?: string;
  },
  loaders: BrunoContextLoaders
) {
  const [tasks, events, assignments] = await Promise.all([
    input.policy.includeTasks
      ? loaders.loadTasks(input.userId)
      : Promise.resolve([]),
    input.policy.includeCalendar
      ? loaders.loadCalendar(input.userId)
      : Promise.resolve([]),
    input.policy.includeCanvas
      ? loaders.loadCanvas(input.userId, input.assignmentId)
      : Promise.resolve([]),
  ]);

  return {
    taskContext: tasks
      .slice(0, 100)
      .map(
        (task) =>
          `- [${task.status}] "${task.title}" (ID: ${task.id}, Due: ${
            task.dueDate ?? 'No due date'
          }, Priority: ${task.priority ?? 'normal'}, Duration: ${
            task.estimatedMinutes ?? 30
          }m)`
      )
      .join('\n'),
    calendarContext: events
      .slice(0, 100)
      .map(
        (event) =>
          `- [${event.status ?? 'scheduled'}] "${event.title}" (ID: ${
            event.id
          }, ${event.startTime} to ${event.endTime})`
      )
      .join('\n'),
    canvasContext: assignments
      .slice(0, 20)
      .map(
        (assignment) =>
          [
            `- "${assignment.name}"`,
            `Course: ${assignment.courseName ?? 'Canvas Course'}`,
            `Due: ${assignment.dueAt ?? 'No due date'}`,
            assignment.description
              ? `Details: ${assignment.description.slice(0, 1000)}`
              : null,
            assignment.htmlUrl ? `URL: ${assignment.htmlUrl}` : null,
          ]
            .filter(Boolean)
            .join(' | ')
      )
      .join('\n'),
  };
}
