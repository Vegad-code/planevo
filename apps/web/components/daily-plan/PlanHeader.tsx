'use client';

import { format } from 'date-fns';
import { BrunoMark } from '@/components/dashboard/home/BrunoMark';

interface PlanHeaderProps {
  userName: string;
  brunoMessage: string;
  isBuilding: boolean;
  hasPlan: boolean;
  pendingCount: number;
  onStartFirstBlock: () => void;
  onAcceptAll: () => void;
  onAdjust: () => void;
  onRegenerate: () => void;
  processing: boolean;
  firstBlockTitle?: string;
}

export function PlanHeader({
  userName,
  brunoMessage,
  isBuilding,
  hasPlan,
  pendingCount,
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

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-7 border-b border-line mb-8">
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="font-mono text-[11px] tracking-[0.18em] text-(--color-ink-soft) uppercase">
          DAILY PLAN · {format(new Date(), 'EEEE MMMM d').toUpperCase()}
        </div>

        <div className="flex items-start gap-3">
          <BrunoMark size={32} mood={hasPlan ? 'happy' : 'normal'} />
          <div>
            <h1 className="font-serif text-[36px] md:text-[42px] leading-tight text-ink m-0">
              {greeting}, <em className="text-(--color-honey-deep) italic font-serif">{userName}.</em>
            </h1>
            <p className="font-sans text-[14.5px] text-(--color-ink-soft) mt-3 mb-0 leading-relaxed">
              {brunoMessage}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {hasPlan && firstBlockTitle && (
            <button
              type="button"
              onClick={onStartFirstBlock}
              disabled={processing}
              className="bg-ink text-paper px-5 py-2.5 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink disabled:opacity-60"
            >
              Start first block &rarr;
            </button>
          )}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onAcceptAll}
              disabled={processing}
              className="bg-(--color-honey) text-ink px-5 py-2.5 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-honey disabled:opacity-60"
            >
              Looks good
            </button>
          )}
          <button
            type="button"
            onClick={onAdjust}
            disabled={processing}
            className="bg-transparent border border-line-strong hover:bg-(--color-cream-2) text-ink px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink disabled:opacity-60"
          >
            Adjust with Bruno
          </button>
          {hasPlan && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={processing}
              className="bg-transparent border border-line-strong hover:bg-(--color-cream-2) text-ink px-5 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink disabled:opacity-60"
            >
              {processing ? 'Regenerating…' : 'Regenerate'}
            </button>
          )}
        </div>
      </div>

      {isBuilding && (
        <div className="flex items-center gap-2 text-(--color-ink-soft) font-mono text-[11px] tracking-wide uppercase">
          <span className="inline-block w-2 h-2 rounded-full bg-(--color-honey) animate-pulse" />
          Building your plan
        </div>
      )}
    </div>
  );
}
