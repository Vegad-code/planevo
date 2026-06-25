'use client';

import { useRouter } from 'next/navigation';
import type { PriorityAlert } from '@/lib/dashboard/types';
import { Warning, Clock, CloudArrowDown } from '@phosphor-icons/react';

const ALERT_ICON: Record<PriorityAlert['kind'], typeof Warning> = {
  overdue_task: Clock,
  canvas_due: Warning,
  stale_sync: CloudArrowDown,
};

interface DashboardAlertsProps {
  alerts: PriorityAlert[];
  onOverdueTaskClick?: (alertId: string) => void;
}

export function DashboardAlerts({ alerts, onOverdueTaskClick }: DashboardAlertsProps) {
  const router = useRouter();

  if (alerts.length === 0) return null;

  return (
    <div className="bg-(--color-paper) rounded-[22px] p-6 border border-line shadow-sm">
      <div className="font-mono text-[11px] text-(--color-ink-soft) tracking-[0.16em] mb-4">
        PRIORITY
      </div>
      <div className="flex flex-col gap-2">
        {alerts.map((alert) => {
          const Icon = ALERT_ICON[alert.kind];
          return (
            <button
              key={alert.id}
              type="button"
              onClick={() => {
                if (alert.kind === 'overdue_task' && onOverdueTaskClick) {
                  onOverdueTaskClick(alert.id);
                } else if (alert.href) {
                  router.push(alert.href);
                }
              }}
              className="flex items-start gap-3 w-full text-left p-3 rounded-2xl border border-line hover:bg-(--color-cream-2)/60 transition-colors cursor-pointer"
            >
              <span className="flex items-center justify-center size-8 rounded-full bg-(--color-rose-soft) text-(--color-rose) shrink-0">
                <Icon className="size-4" weight="fill" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-(--color-ink) truncate">
                  {alert.title}
                </div>
                <div className="text-xs text-(--color-ink-soft) mt-0.5">{alert.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
