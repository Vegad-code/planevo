'use client';

import { format } from 'date-fns';
import {
  ArrowsClockwise,
  CheckCircle,
  Play,
  Sparkle,
  SpinnerGap,
} from '@phosphor-icons/react';
import type { DailyPlanCapacity } from '@/lib/plan/agent/types';
import { cn } from '@/lib/utils';
import { SmoothSurface } from './SmoothSurface';

interface PlanHeaderProps {
  userName: string;
  brunoMessage: string;
  isBuilding: boolean;
  hasPlan: boolean;
  pendingCount: number;
  capacity: DailyPlanCapacity;
  onStartFirstBlock: () => void;
  onAcceptAll: () => void;
  onAdjust: () => void;
  onRegenerate: () => void;
  processing: boolean;
  firstBlockTitle?: string;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function capacityLabel(status: DailyPlanCapacity['status']): string {
  switch (status) {
    case 'overloaded':
      return 'Overloaded';
    case 'tight':
      return 'Tight';
    default:
      return 'Healthy';
  }
}

export function PlanHeader({
  userName,
  brunoMessage,
  isBuilding,
  hasPlan,
  pendingCount,
  capacity,
  onStartFirstBlock,
  onAcceptAll,
  onAdjust,
  onRegenerate,
  processing,
  firstBlockTitle,
}: PlanHeaderProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statusTone =
    capacity.status === 'overloaded'
      ? 'border-[#f4b4aa]/30 bg-[#f4b4aa]/12 text-[#ffd4cd] dark:border-[var(--color-rose)]/30 dark:bg-[var(--color-rose)]/10 dark:text-[var(--color-rose)]'
      : capacity.status === 'tight'
        ? 'border-[#f4d89f]/30 bg-[#f4d89f]/12 text-[#ffdfad] dark:border-[var(--color-honey)]/30 dark:bg-[var(--color-honey)]/10 dark:text-[var(--color-honey-deep)]'
        : 'border-[#c7dfbd]/30 bg-[#c7dfbd]/12 text-[#d8edcf] dark:border-[var(--color-sage)]/30 dark:bg-[var(--color-sage)]/10 dark:text-[var(--color-sage)]';

  return (
    <SmoothSurface
      as="header"
      cornerRadius={34}
      cornerSmoothing={0.9}
      className="mb-5 border border-white/10 bg-[#17120d] text-[#fbf6ea] shadow-[0_28px_80px_rgba(26,20,13,0.18)] dark:border-line dark:bg-[var(--color-surface-raised)] dark:text-ink"
    >
      <div className="flex flex-col gap-8 p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#d8cdbb] dark:text-[var(--color-ink-soft)]">
            <span>Daily Plan</span>
            <span className="text-[#8f8370] dark:text-[var(--color-ink-faint)]">
              /
            </span>
            <span>{format(new Date(), 'EEEE MMMM d')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium',
                statusTone,
              )}
            >
              {capacityLabel(capacity.status)}
            </span>
            {isBuilding && (
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 text-xs font-medium text-[#f4eadb] dark:border-line dark:bg-paper/0 dark:text-ink-soft">
                <SpinnerGap
                  weight="bold"
                  className="h-3.5 w-3.5 animate-spin"
                />
                Building
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-end">
          <div className="min-w-0">
            <p className="m-0 text-[14px] font-medium text-[#d8cdbb] dark:text-[var(--color-ink-soft)]">
              {greeting}, {userName}.
            </p>
            <h1 className="m-0 mt-2 max-w-[760px] text-balance text-[34px] font-semibold leading-[1.02] tracking-normal sm:text-[46px] lg:text-[54px]">
              Your day, assembled.
            </h1>
            <p className="m-0 mt-4 max-w-[660px] text-pretty text-[15px] leading-7 text-[#d8cdbb] dark:text-[var(--color-ink-soft)]">
              {brunoMessage}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[#fbf6ea] dark:text-ink">
            <div className="rounded-2xl border border-white/12 bg-white/8 p-3 dark:border-line dark:bg-[var(--color-surface-muted)]">
              <p className="m-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[#b9ad9a] dark:text-[var(--color-ink-faint)]">
                Planned
              </p>
              <p className="m-0 mt-1 text-lg font-semibold">
                {formatMinutes(capacity.plannedFocusMinutes)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/8 p-3 dark:border-line dark:bg-[var(--color-surface-muted)]">
              <p className="m-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[#b9ad9a] dark:text-[var(--color-ink-faint)]">
                Fixed
              </p>
              <p className="m-0 mt-1 text-lg font-semibold">
                {formatMinutes(capacity.fixedMinutes)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/8 p-3 dark:border-line dark:bg-[var(--color-surface-muted)]">
              <p className="m-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[#b9ad9a] dark:text-[var(--color-ink-faint)]">
                Open
              </p>
              <p className="m-0 mt-1 text-lg font-semibold">
                {capacity.overflowCount}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPlan && firstBlockTitle && (
            <button
              type="button"
              onClick={onStartFirstBlock}
              disabled={processing}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#fbf6ea] px-4 text-sm font-semibold text-[#17120d] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbf6ea] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17120d] disabled:opacity-50 dark:bg-ink dark:text-paper dark:hover:bg-ink/90 dark:focus-visible:ring-ink dark:focus-visible:ring-offset-paper"
            >
              <Play weight="fill" className="h-4 w-4" />
              Start block
            </button>
          )}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onAcceptAll}
              disabled={processing}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-honey)] px-4 text-sm font-semibold text-[#17120d] transition hover:bg-[var(--color-honey)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-honey)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17120d] disabled:opacity-50 dark:focus-visible:ring-offset-paper"
            >
              <CheckCircle weight="fill" className="h-4 w-4" />
              Accept plan
            </button>
          )}
          <button
            type="button"
            onClick={onAdjust}
            disabled={processing}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-semibold text-[#fbf6ea] transition hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbf6ea] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17120d] disabled:opacity-50 dark:border-line dark:bg-transparent dark:text-ink dark:hover:bg-[var(--color-surface-muted)] dark:focus-visible:ring-ink dark:focus-visible:ring-offset-paper"
          >
            <Sparkle weight="fill" className="h-4 w-4" />
            Adjust
          </button>
          {hasPlan && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={processing}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-transparent px-4 text-sm font-semibold text-[#fbf6ea] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbf6ea] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17120d] disabled:opacity-50 dark:border-line dark:text-ink dark:hover:bg-[var(--color-surface-muted)] dark:focus-visible:ring-ink dark:focus-visible:ring-offset-paper"
            >
              <ArrowsClockwise
                weight="bold"
                className={cn('h-4 w-4', processing && 'animate-spin')}
              />
              {processing ? 'Refreshing' : 'Refresh plan'}
            </button>
          )}
        </div>
      </div>
    </SmoothSurface>
  );
}
