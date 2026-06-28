'use client';

import { format } from 'date-fns';
import { CalendarBlank, Lightning, Coffee } from '@phosphor-icons/react';
import type { DayPlanBlock } from '@/lib/plan/day-plan';
import { cn } from '@/lib/utils';

interface PlanBlockCardProps {
  block: DayPlanBlock;
  isNow: boolean;
  isNext: boolean;
  onAccept: () => void;
  onReject: () => void;
  onStart?: () => void;
  processing?: boolean;
}

function BlockIcon({ type }: { type: DayPlanBlock['type'] }) {
  switch (type) {
    case 'event':
      return <CalendarBlank className="w-4 h-4 text-(--color-blue)" />;
    case 'break':
      return <Coffee className="w-4 h-4 text-(--color-sage)" />;
    default:
      return <Lightning className="w-4 h-4 text-(--color-honey)" />;
  }
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

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-all',
        isNow
          ? 'border-(--color-honey) bg-(--color-honey)/8 shadow-sm'
          : 'border-[var(--glass-border)] bg-[var(--color-surface-raised)]',
        isPending && 'border-dashed'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="mt-0.5">
            <BlockIcon type={block.type} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-[11px] text-(--color-ink-soft) tracking-wide">
                {format(block.startTime, 'h:mm a')}
              </span>
              <span className="font-mono text-[10px] text-(--color-ink-faint)">
                {block.duration}m
              </span>
              {isNow && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-(--color-honey-deep)">
                  Now
                </span>
              )}
              {!isNow && isNext && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-(--color-ink-soft)">
                  Up next
                </span>
              )}
              {isFixed && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-(--color-ink-faint)">
                  Fixed
                </span>
              )}
            </div>
            <h3 className="font-serif text-lg text-ink m-0 leading-snug">{block.title}</h3>
            {block.reason && (
              <p className="text-[13px] text-(--color-ink-soft) mt-2 mb-0 leading-relaxed">
                {block.reason}
              </p>
            )}
          </div>
        </div>
      </div>

      {!isFixed && isPending && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
          <button
            type="button"
            onClick={onAccept}
            disabled={processing}
            className="bg-(--color-honey) text-ink px-4 py-2 rounded-full text-xs font-medium cursor-pointer hover:scale-105 transition-transform disabled:opacity-60"
          >
            Looks good
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={processing}
            className="bg-transparent border border-line-strong text-ink px-4 py-2 rounded-full text-xs font-medium cursor-pointer hover:bg-(--color-cream-2) transition-colors disabled:opacity-60"
          >
            Wrong time
          </button>
        </div>
      )}

      {!isFixed && !isPending && block.type === 'focus' && onStart && (
        <div className="mt-4 pt-4 border-t border-line">
          <button
            type="button"
            onClick={onStart}
            className="text-(--color-honey-deep) font-mono text-[11px] tracking-wide hover:text-(--color-honey) cursor-pointer bg-transparent border-none p-0"
          >
            Start this block &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
