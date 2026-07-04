import type { BrunoModelPolicy, BrunoDataAccess } from './types';
import { DEFAULT_BRUNO_DATA_ACCESS } from './types';

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

export type BrunoIntegrationContextRow = {
  provider: string;
  title: string;
  status: string | null;
  dueDate: string | null;
  url: string | null;
};

export type BrunoIntegrationPulseRow = {
  provider: string;
  connected: boolean;
  openCount: number;
  dueThisWeek: number;
  label: string;
};

export type BrunoIntegrationContext = {
  pulses: BrunoIntegrationPulseRow[];
  items: BrunoIntegrationContextRow[];
};

export type BrunoContextLoaders = {
  loadTasks: (userId: string) => Promise<BrunoTaskContextRow[]>;
  loadCalendar: (userId: string) => Promise<BrunoCalendarContextRow[]>;
  loadCanvas: (
    userId: string,
    assignmentId?: string
  ) => Promise<BrunoCanvasContextRow[]>;
  loadIntegrations?: (userId: string) => Promise<BrunoIntegrationContext>;
};

function sanitizeUserContent(value: string, maxLength = 500): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/```/g, "'''")
    .slice(0, maxLength);
}

export async function buildBrunoContext(
  input: {
    userId: string;
    policy: BrunoModelPolicy;
    assignmentId?: string;
    dataAccess?: BrunoDataAccess;
  },
  loaders: BrunoContextLoaders
) {
  const access = input.dataAccess ?? DEFAULT_BRUNO_DATA_ACCESS;
  const emptyIntegrations: BrunoIntegrationContext = { pulses: [], items: [] };
  const [tasks, events, assignments, integrations] = await Promise.all([
    input.policy.includeTasks && access.tasks
      ? loaders.loadTasks(input.userId)
      : Promise.resolve([]),
    input.policy.includeCalendar && access.calendar
      ? loaders.loadCalendar(input.userId)
      : Promise.resolve([]),
    input.policy.includeCanvas && access.canvas
      ? loaders.loadCanvas(input.userId, input.assignmentId)
      : Promise.resolve([]),
    input.policy.includeTasks && loaders.loadIntegrations && access.integrations
      ? loaders.loadIntegrations(input.userId)
      : Promise.resolve(emptyIntegrations),
  ]);

  return {
    taskContext: tasks
      .slice(0, 100)
      .map(
        (task) =>
          `- [${sanitizeUserContent(task.status, 80)}] "${sanitizeUserContent(task.title)}" (ID: ${task.id}, Due: ${
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
          `- [${sanitizeUserContent(event.status ?? 'scheduled', 80)}] "${sanitizeUserContent(event.title)}" (ID: ${
            event.id
          }, ${event.startTime} to ${event.endTime})`
      )
      .join('\n'),
    canvasContext: assignments
      .slice(0, 20)
      .map(
        (assignment) =>
          [
            `- "${sanitizeUserContent(assignment.name)}"`,
            `Course: ${sanitizeUserContent(assignment.courseName ?? 'Canvas Course', 200)}`,
            `Due: ${assignment.dueAt ?? 'No due date'}`,
            assignment.description
              ? `Details: ${sanitizeUserContent(assignment.description, 1000)}`
              : null,
            assignment.htmlUrl ? `URL: ${assignment.htmlUrl}` : null,
          ]
            .filter(Boolean)
            .join(' | ')
      )
      .join('\n'),
    integrationContext: buildIntegrationContext(integrations),
  };
}

function buildIntegrationContext(integrations: BrunoIntegrationContext): string {
  const connected = integrations.pulses.filter((p) => p.connected);
  if (connected.length === 0) return '';

  const summary = connected
    .map(
      (p) =>
        `- ${p.provider}: ${p.openCount} open${
          p.dueThisWeek > 0 ? `, ${p.dueThisWeek} due this week` : ''
        }`
    )
    .join('\n');

  const items = integrations.items
    .slice(0, 30)
    .map(
      (item) =>
        `- [${item.provider}] "${sanitizeUserContent(item.title)}"${
          item.status ? ` (Status: ${sanitizeUserContent(item.status, 80)})` : ''
        }${item.dueDate ? ` (Due: ${item.dueDate})` : ''}${
          item.url ? ` (URL: ${item.url})` : ''
        }`
    )
    .join('\n');

  return `Connected work tools:\n${summary}${items ? `\n\nWork items:\n${items}` : ''}`;
}
