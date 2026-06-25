import type { Task } from '@/types/tasks';
import type {
  DashboardConnections,
  DashboardMode,
  PriorityAlert,
  SetupStep,
} from './types';

interface ModeInput {
  hasTodayBlocks: boolean;
  openTaskCount: number;
  canvasDueCount: number;
  weekAgendaCount: number;
  connections: DashboardConnections;
}

export function getDashboardMode({
  hasTodayBlocks,
  openTaskCount,
  canvasDueCount,
  weekAgendaCount,
  connections,
}: ModeInput): DashboardMode {
  if (hasTodayBlocks) return 'active_day';

  const hasPendingWork = openTaskCount > 0 || canvasDueCount > 0;
  if (hasPendingWork) return 'needs_plan';

  const integrationsConnected =
    connections.canvasConnected || connections.googleConnected;

  if (!integrationsConnected && weekAgendaCount === 0) {
    return 'onboarding';
  }

  if (weekAgendaCount === 0) {
    return 'caught_up';
  }

  // Week has events but today is unplanned — calendar-focused, not "needs plan"
  return 'active_day';
}

export function getSetupSteps(connections: DashboardConnections, hasTasks: boolean): SetupStep[] {
  return [
    {
      id: 'canvas',
      label: 'Connect Canvas',
      completed: connections.canvasConnected,
      href: '/dashboard/settings/integrations',
    },
    {
      id: 'calendar',
      label: 'Connect Google Calendar',
      completed: connections.googleConnected,
      href: '/dashboard/settings/integrations',
    },
    {
      id: 'task',
      label: 'Add your first task',
      completed: hasTasks,
      href: '/dashboard/tasks',
    },
    {
      id: 'plan',
      label: 'Generate your daily plan',
      completed: false,
      href: '/dashboard/daily-plan',
    },
  ];
}

export function getPriorityAlerts(
  tasks: Task[],
  connections: DashboardConnections
): PriorityAlert[] {
  const alerts: PriorityAlert[] = [];
  const now = new Date();

  const overdueTasks = tasks.filter((t) => {
    if (t.completed || !t.due_date) return false;
    return new Date(t.due_date) < now;
  });

  for (const task of overdueTasks.slice(0, 3)) {
    alerts.push({
      id: `overdue-${task.id}`,
      kind: 'overdue_task',
      title: task.title,
      subtitle: 'Overdue — tap to view',
    });
  }

  if (connections.canvasDueCount > 0) {
    alerts.push({
      id: 'canvas-due',
      kind: 'canvas_due',
      title: `${connections.canvasDueCount} Canvas assignment${connections.canvasDueCount > 1 ? 's' : ''} due soon`,
      subtitle: 'Due within the next 7 days',
      href: '/dashboard/tasks?filter=canvas',
    });
  }

  if (connections.googleConnected && connections.googleLastSyncedAt) {
    const hoursSinceSync =
      (Date.now() - new Date(connections.googleLastSyncedAt).getTime()) / (1000 * 60 * 60);
    const threshold =
      connections.googleSyncFrequency === 'weekly'
        ? 24 * 7
        : connections.googleSyncFrequency === 'daily'
          ? 24
          : 2;

    if (hoursSinceSync >= threshold) {
      alerts.push({
        id: 'stale-sync',
        kind: 'stale_sync',
        title: 'Calendar sync may be stale',
        subtitle: 'Last synced a while ago — check settings',
        href: '/dashboard/settings/integrations',
      });
    }
  } else if (connections.googleConnected && !connections.googleLastSyncedAt) {
    alerts.push({
      id: 'never-synced',
      kind: 'stale_sync',
      title: 'Calendar not synced yet',
      subtitle: 'Run a sync from settings',
      href: '/dashboard/settings/integrations',
    });
  }

  return alerts.slice(0, 5);
}
