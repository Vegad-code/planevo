'use client';

import type { DayPlanBlock, DayPlanSnapshot } from '@/lib/plan/day-plan';
import { PlanBlockCard } from './PlanBlockCard';
import { SmoothSurface } from './SmoothSurface';

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
      <SmoothSurface
        cornerRadius={28}
        cornerSmoothing={0.88}
        className="border border-line bg-[var(--color-surface-raised)] p-10 text-center"
      >
        <p className="m-0 text-lg font-semibold text-ink">
          No blocks scheduled yet.
        </p>
        <p className="m-0 mt-2 text-[14px] text-[var(--color-ink-soft)]">
          Bruno will build your plan automatically, or tap Regenerate.
        </p>
      </SmoothSurface>
    );
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {blocks.map((block) => (
        <li key={block.id}>
          <PlanBlockCard
            block={block}
            isNow={block.id === nowBlockId}
            isNext={block.id === nextBlockId}
            onAccept={() => onBlockAccept(block.id)}
            onReject={() => onBlockReject(block.id)}
            onStart={() => onBlockStart(block)}
            processing={
              blockProcessing ? blockProcessing(block.id) : processing
            }
          />
        </li>
      ))}
    </ol>
  );
}
