'use client';

import { CheckSquare, Clock, Warning } from '@phosphor-icons/react';
import { StatTile } from '@/components/dashboard/v4/StatTile';
import { GlassPanel } from '@/components/ui/glass-panel';
import type { ParsedScheduleBlock } from '@/lib/dashboard/types';

interface DashboardKpiRowProps {
  openTaskCount: number;
  overdueCount: number;
  plannedMinutes: number;
  parsedSchedule: ParsedScheduleBlock[] | null;
}

export function DashboardKpiRow({
  openTaskCount,
  overdueCount,
  plannedMinutes,
  parsedSchedule,
}: DashboardKpiRowProps) {
  const totalBlocks = parsedSchedule?.length ?? 0;
  const completedBlocks =
    parsedSchedule?.filter((b) => b.status === 'confirmed').length ?? 0;
  const progressPct = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile
        label="Open tasks"
        value={openTaskCount}
        sublabel="In your backlog"
        icon={<CheckSquare size={16} weight="bold" />}
      />
      <StatTile
        label="Time planned"
        value={`${Math.floor(plannedMinutes / 60)}h ${plannedMinutes % 60}m`}
        sublabel="Scheduled for today"
        icon={<Clock size={16} weight="bold" />}
      />
      <StatTile
        label="Overdue"
        value={overdueCount}
        sublabel={overdueCount > 0 ? 'Needs attention' : 'All caught up'}
        icon={<Warning size={16} weight="bold" />}
        trend={overdueCount > 0 ? `${overdueCount} past due` : undefined}
      />
      <GlassPanel variant="card" className="p-5 flex flex-col justify-between gap-4 sm:col-span-2 lg:col-span-1">
        <div>
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-faint)]">
            Today&apos;s plan
          </span>
          <p className="font-serif text-2xl text-[var(--color-ink)] mt-2">{progressPct}%</p>
          <p className="text-xs text-[var(--color-ink-faint)] mt-1">
            {completedBlocks} of {totalBlocks} blocks done
          </p>
        </div>
        <div className="h-2 rounded-full bg-[var(--color-line)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent-warm)] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </GlassPanel>
    </div>
  );
}
