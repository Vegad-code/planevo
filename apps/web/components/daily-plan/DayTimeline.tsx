'use client';

import type { DayPlanBlock, DayPlanSnapshot } from '@/lib/plan/day-plan';
import { PlanBlockCard } from './PlanBlockCard';

interface DayTimelineProps {
  snapshot: DayPlanSnapshot;
  onBlockAccept: (blockId: string) => void;
  onBlockReject: (blockId: string) => void;
  onBlockStart: (block: DayPlanBlock) => void;
  processing?: boolean;
  blockProcessing?: (blockId: string) => boolean;
}

export function DayTimeline({
  snapshot,
  onBlockAccept,
  onBlockReject,
  onBlockStart,
  processing,
  blockProcessing,
}: DayTimelineProps) {
  const { blocks, nowBlockId, nextBlockId } = snapshot;

  if (blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--color-surface-raised)] p-12 text-center">
        <p className="font-serif text-xl text-(--color-ink-soft) m-0">
          No blocks scheduled yet.
        </p>
        <p className="text-[14px] text-(--color-ink-faint) mt-2 mb-0">
          Bruno will build your plan automatically, or tap Regenerate.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block) => (
        <PlanBlockCard
          key={block.id}
          block={block}
          isNow={block.id === nowBlockId}
          isNext={block.id === nextBlockId}
          onAccept={() => onBlockAccept(block.id)}
          onReject={() => onBlockReject(block.id)}
          onStart={() => onBlockStart(block)}
          processing={blockProcessing ? blockProcessing(block.id) : processing}
        />
      ))}
    </div>
  );
}
