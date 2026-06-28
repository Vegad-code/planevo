'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { SourcePill } from '@/components/dashboard/home/SourcePill';
import type {
  DashboardConnections,
  DashboardMode,
  NextAction,
  PriorityAlert,
  TimeOfDay,
} from '@/lib/dashboard/types';

interface DashboardHeaderProps {
  userName: string;
  timeOfDay: TimeOfDay;
  blockCount: number;
  mode: DashboardMode;
  nextAction: NextAction | null;
  openTaskCount: number;
  priorityAlerts: PriorityAlert[];
  connections: DashboardConnections;
}

function buildSubtitle({
  mode,
  blockCount,
  nextAction,
  openTaskCount,
  connections,
  priorityAlerts,
}: Omit<DashboardHeaderProps, 'userName' | 'timeOfDay'>): string {
  const overdueCount = priorityAlerts.filter((a) => a.kind === 'overdue_task').length;

  if (mode === 'active_day' && nextAction) {
    const prefix =
      blockCount > 0
        ? `${blockCount} block${blockCount > 1 ? 's' : ''} on your plate.`
        : 'Your day is mapped out.';
    const timing =
      nextAction.timingStatus === 'NOW'
        ? `In progress — ${nextAction.title}.`
        : `Next up at ${format(nextAction.startTime, 'h:mm a')} — ${nextAction.title}.`;
    return `${prefix} ${timing}`;
  }

  if (mode === 'needs_plan') {
    const parts: string[] = [];
    if (openTaskCount > 0) {
      parts.push(`${openTaskCount} open task${openTaskCount > 1 ? 's' : ''} waiting for a plan`);
    }
    if (connections.canvasDueCount > 0) {
      parts.push(
        `${connections.canvasDueCount} Canvas assignment${connections.canvasDueCount > 1 ? 's' : ''} due this week`
      );
    }
    if (overdueCount > 0) {
      parts.push(`${overdueCount} overdue`);
    }
    return parts.length > 0
      ? `${parts.join(' · ')}.`
      : 'Bruno can build a plan around your calendar and tasks.';
  }

  if (mode === 'onboarding') {
    return 'Connect Canvas or Calendar, add a task, then let Bruno shape your day.';
  }

  if (mode === 'caught_up') {
    return 'Nothing urgent on the horizon — add something when you are ready.';
  }

  if (blockCount > 0) {
    return `${blockCount} block${blockCount > 1 ? 's' : ''} on your plate. Bruno has your back.`;
  }

  return "Let's organize your day.";
}

export function DashboardHeader({
  userName,
  timeOfDay,
  blockCount,
  mode,
  nextAction,
  openTaskCount,
  priorityAlerts,
  connections,
}: DashboardHeaderProps) {
  const greetingPrefix =
    timeOfDay === 'morning'
      ? 'Good morning'
      : timeOfDay === 'afternoon'
        ? 'Good afternoon'
        : 'Good evening';
  const dateStr = format(new Date(), 'EEEE · MMM d · h:mm a').toUpperCase();
  const firstName = userName.split(' ')[0] || 'Planevo';
  const subtitle = buildSubtitle({
    blockCount,
    mode,
    nextAction,
    openTaskCount,
    priorityAlerts,
    connections,
  });

  const showSetupLink = mode === 'onboarding';
  const showPlanLink = mode === 'needs_plan';
  const overdueCount = priorityAlerts.filter((a) => a.kind === 'overdue_task').length;

  return (
    <div className="pb-7 border-b border-line mb-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="font-mono text-[11px] tracking-[0.18em] text-(--color-ink-soft) uppercase">
          {dateStr}
        </div>
        <NotificationBell />
      </div>
      <h1 className="font-serif text-5xl md:text-6xl tracking-tight text-(--color-ink) m-0 leading-none">
        {greetingPrefix},{' '}
        <em className="text-(--color-honey-deep) not-italic">{firstName}.</em>
      </h1>
      <p className="font-sans text-[15px] text-(--color-ink-soft) mt-3 mb-0 max-w-2xl">
        {subtitle}
      </p>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <SourcePill
          kind="canvas"
          label="Canvas"
          count={`${connections.canvasDueCount} due`}
          status={connections.canvasConnected ? 'synced' : ''}
        />
        <SourcePill
          kind="cal"
          label="Calendar"
          count="Synced"
          status={connections.googleConnected ? 'synced' : ''}
        />
      </div>

      {(showSetupLink || showPlanLink || overdueCount > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
          {showSetupLink && (
            <Link
              href="/dashboard/settings/integrations"
              className="font-mono text-[11px] tracking-wide text-(--color-honey-deep) hover:text-(--color-honey)"
            >
              Set up integrations →
            </Link>
          )}
          {showPlanLink && (
            <Link
              href="/dashboard/daily-plan"
              className="font-mono text-[11px] tracking-wide text-(--color-honey-deep) hover:text-(--color-honey)"
            >
              Generate today&apos;s plan →
            </Link>
          )}
          {overdueCount > 0 && (
            <Link
              href="/dashboard/tasks?filter=upcoming"
              className="font-mono text-[11px] tracking-wide text-(--color-rose) hover:opacity-80"
            >
              {overdueCount} overdue task{overdueCount > 1 ? 's' : ''} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
