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

export async function buildBrunoContext(
  input: {
    userId: string;
    policy: BrunoModelPolicy;
    assignmentId?: string;
  },
  loaders: BrunoContextLoaders
) {
  const emptyIntegrations: BrunoIntegrationContext = { pulses: [], items: [] };
  const [tasks, events, assignments, integrations] = await Promise.all([
    input.policy.includeTasks
      ? loaders.loadTasks(input.userId)
      : Promise.resolve([]),
    input.policy.includeCalendar
      ? loaders.loadCalendar(input.userId)
      : Promise.resolve([]),
    input.policy.includeCanvas
      ? loaders.loadCanvas(input.userId, input.assignmentId)
      : Promise.resolve([]),
    input.policy.includeTasks && loaders.loadIntegrations
      ? loaders.loadIntegrations(input.userId)
      : Promise.resolve(emptyIntegrations),
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
        `- [${item.provider}] "${item.title}"${
          item.status ? ` (Status: ${item.status})` : ''
        }${item.dueDate ? ` (Due: ${item.dueDate})` : ''}${
          item.url ? ` (URL: ${item.url})` : ''
        }`
    )
    .join('\n');

  return `Connected work tools:\n${summary}${items ? `\n\nWork items:\n${items}` : ''}`;
}
