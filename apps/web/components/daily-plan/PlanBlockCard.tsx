'use client';

import { format } from 'date-fns';
import {
  CalendarBlank,
  Check,
  Coffee,
  Lightning,
  Play,
  Sparkle,
  X,
} from '@phosphor-icons/react';
import type { DayPlanBlock } from '@/lib/plan/day-plan';
import { cn } from '@/lib/utils';
import { SmoothSurface } from './SmoothSurface';

interface PlanBlockCardProps {
  block: DayPlanBlock;
  isNow: boolean;
  isNext: boolean;
  onAccept: () => void;
  onReject: () => void;
  onStart?: () => void;
  processing?: boolean;
}

function BlockIcon({
  type,
  active,
}: {
  type: DayPlanBlock['type'];
  active: boolean;
}) {
  const className = active
    ? 'h-4 w-4 text-[#fbf6ea] dark:text-ink'
    : 'h-4 w-4 text-[var(--color-honey-deep)]';

  switch (type) {
    case 'event':
      return <CalendarBlank weight="bold" className={className} />;
    case 'break':
      return <Coffee weight="bold" className={className} />;
    default:
      return <Lightning weight="bold" className={className} />;
  }
}

function sourceLabel(block: DayPlanBlock): string {
  const firstSource =
    block.sourceIds[0]?.split(':')[0] ?? block.source ?? 'schedule';
  switch (firstSource) {
    case 'google_calendar':
      return 'Calendar';
    case 'canvas':
      return 'Canvas';
    case 'notion':
      return 'Notion';
    case 'slack':
      return 'Slack';
    case 'linear':
      return 'Linear';
    case 'task':
      return 'Task';
    default:
      return block.isAiSuggested ? 'Bruno' : 'Manual';
  }
}

function blockStatusLabel({
  isNow,
  isNext,
  isFixed,
  isPending,
}: {
  isNow: boolean;
  isNext: boolean;
  isFixed: boolean;
  isPending: boolean;
}) {
  if (isNow) return 'Now';
  if (isNext) return 'Up next';
  if (isPending) return 'Needs review';
  if (isFixed) return 'Fixed';
  return 'Planned';
}

export function PlanBlockCard({
  block,
  isNow,
  isNext,
  onAccept,
  onReject,
  onStart,
  processing,
}: PlanBlockCardProps) {
  const isPending = block.isAiSuggested && block.status === 'pending';
  const isFixed = block.isFixed;
  const timeRange = `${format(block.startTime, 'h:mm a')} - ${format(block.endTime, 'h:mm a')}`;
  const active = isNow;

  const mutedText = active
    ? 'text-[#d8cdbb] dark:text-[var(--color-ink-soft)]'
    : 'text-[var(--color-ink-soft)]';
  const faintText = active
    ? 'text-[#b8ad9d] dark:text-[var(--color-ink-faint)]'
    : 'text-[var(--color-ink-faint)]';
  const divider = active ? 'border-white/12 dark:border-line' : 'border-line';

  return (
    <SmoothSurface
      as="article"
      data-testid="plan-block"
      cornerRadius={28}
      cornerSmoothing={0.88}
      className={cn(
        'border transition-colors',
        active
          ? 'border-transparent bg-[#17120d] text-[#fbf6ea] shadow-[0_22px_70px_rgba(26,20,13,0.18)] dark:border-line dark:bg-[var(--color-surface-raised)] dark:text-ink'
          : 'border-line bg-[var(--color-surface-raised)] text-ink shadow-[0_12px_34px_rgba(26,20,13,0.05)]',
        isPending &&
          !active &&
          'border-[var(--color-honey)]/45 bg-[var(--color-honey-soft)]/22',
      )}
    >
      <div className="grid gap-4 p-4 sm:grid-cols-[116px_minmax(0,1fr)] sm:p-5">
        <div className="flex items-start gap-3 sm:block">
          <div
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full border',
              active
                ? 'border-white/12 bg-white/10 dark:border-line dark:bg-[var(--color-surface-muted)]'
                : 'border-line bg-[var(--color-surface-muted)]',
            )}
          >
            <BlockIcon type={block.type} active={active} />
          </div>
          <div className="min-w-0 sm:mt-3">
            <p
              className={cn(
                'm-0 text-[17px] font-semibold leading-none',
                active ? 'text-[#fbf6ea] dark:text-ink' : 'text-ink',
              )}
            >
              {format(block.startTime, 'h:mm')}
            </p>
            <p className={cn('m-0 mt-1 text-xs font-medium', faintText)}>
              {format(block.startTime, 'a')}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.12em]',
                mutedText,
              )}
            >
              {timeRange}
            </span>
            <span
              className={cn(
                'h-1 w-1 rounded-full',
                active
                  ? 'bg-[#8f8370] dark:bg-[var(--color-ink-faint)]'
                  : 'bg-[var(--color-ink-faint)]',
              )}
            />
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.12em]',
                mutedText,
              )}
            >
              {block.duration}m
            </span>
            <span
              className={cn(
                'h-1 w-1 rounded-full',
                active
                  ? 'bg-[#8f8370] dark:bg-[var(--color-ink-faint)]'
                  : 'bg-[var(--color-ink-faint)]',
              )}
            />
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.12em]',
                mutedText,
              )}
            >
              {sourceLabel(block)}
            </span>
            {block.isAiSuggested && (
              <span
                className={cn(
                  'inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium',
                  active
                    ? 'border-white/12 bg-white/8 text-[#fbf6ea] dark:border-line dark:bg-[var(--color-surface-muted)] dark:text-ink'
                    : 'border-line bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)]',
                )}
              >
                <Sparkle weight="fill" className="h-3.5 w-3.5" />
                Bruno
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="m-0 text-[18px] font-semibold leading-snug sm:text-[20px]">
                {block.title}
              </h3>
              {block.reason && (
                <p
                  className={cn(
                    'm-0 mt-2 max-w-[680px] text-sm leading-6',
                    mutedText,
                  )}
                >
                  {block.reason}
                </p>
              )}
            </div>

            <span
              className={cn(
                'inline-flex min-h-8 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-semibold',
                active
                  ? 'border-white/12 bg-white/8 text-[#fbf6ea] dark:border-line dark:bg-[var(--color-surface-muted)] dark:text-ink'
                  : 'border-line bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)]',
              )}
            >
              {blockStatusLabel({ isNow, isNext, isFixed, isPending })}
            </span>
          </div>

          {(!isFixed && isPending) ||
          (!isFixed && !isPending && block.type === 'focus' && onStart) ? (
            <div
              className={cn('mt-4 flex flex-wrap gap-2 border-t pt-4', divider)}
            >
              {!isFixed && isPending && (
                <>
                  <button
                    type="button"
                    onClick={onAccept}
                    disabled={processing}
                    className={cn(
                      'inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
                      active
                        ? 'bg-[#fbf6ea] text-[#17120d] hover:bg-white focus-visible:ring-[#fbf6ea] focus-visible:ring-offset-[#17120d] dark:bg-ink dark:text-paper dark:focus-visible:ring-ink dark:focus-visible:ring-offset-paper'
                        : 'bg-ink text-paper hover:bg-ink/90 focus-visible:ring-ink',
                    )}
                  >
                    <Check weight="bold" className="h-4 w-4" />
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={onReject}
                    disabled={processing}
                    className={cn(
                      'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
                      active
                        ? 'border-white/15 bg-white/8 text-[#fbf6ea] hover:bg-white/12 focus-visible:ring-[#fbf6ea] focus-visible:ring-offset-[#17120d] dark:border-line dark:bg-transparent dark:text-ink dark:focus-visible:ring-ink dark:focus-visible:ring-offset-paper'
                        : 'border-line-strong bg-transparent text-ink hover:bg-[var(--color-surface-muted)] focus-visible:ring-ink',
                    )}
                  >
                    <X weight="bold" className="h-4 w-4" />
                    Move
                  </button>
                </>
              )}

              {!isFixed && !isPending && block.type === 'focus' && onStart && (
                <button
                  type="button"
                  onClick={onStart}
                  className={cn(
                    'inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    active
                      ? 'bg-[#fbf6ea] text-[#17120d] hover:bg-white focus-visible:ring-[#fbf6ea] focus-visible:ring-offset-[#17120d] dark:bg-ink dark:text-paper dark:focus-visible:ring-ink dark:focus-visible:ring-offset-paper'
                      : 'bg-ink text-paper hover:bg-ink/90 focus-visible:ring-ink',
                  )}
                >
                  <Play weight="fill" className="h-4 w-4" />
                  Start block
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </SmoothSurface>
  );
}
