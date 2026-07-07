'use client';

import { useMotionValueEvent, useReducedMotion, type MotionValue } from 'framer-motion';
import { useMemo, useState } from 'react';
import { HERO_TIMELINE_TASKS } from '@/components/landing-v2/demo/fixtures';
import { cn } from '@/lib/utils';
import { TRACK_LEFT, TRACK_RIGHT } from './heroTimelineLayout';
import { HeroDepositPill } from './HeroDepositPill';
import { StructuredDayColumn } from './StructuredDayColumn';
import { VacuumScatterPill } from './VacuumScatterPill';

interface ElasticTimeStreamProps {
  smoothProgress: MotionValue<number>;
  className?: string;
  variant?: 'desktop' | 'mobile';
}

function ScrollLinkedStream({
  smoothProgress,
  className,
  compact = false,
}: {
  smoothProgress: MotionValue<number>;
  className?: string;
  compact?: boolean;
}) {
  const [floatActive, setFloatActive] = useState(true);

  const trackTasks = useMemo(
    () => ({
      left: HERO_TIMELINE_TASKS.filter((t) => t.track === 'left').sort((a, b) => a.order - b.order),
      right: HERO_TIMELINE_TASKS.filter((t) => t.track === 'right').sort((a, b) => a.order - b.order),
    }),
    [],
  );

  useMotionValueEvent(smoothProgress, 'change', (v) => {
    if (v > 0.02) setFloatActive(false);
  });

  return (
    <div
      className={cn(
        'relative h-full w-full',
        compact ? 'origin-bottom scale-[0.72] sm:scale-[0.8]' : '',
        className,
      )}
      aria-hidden
    >
      {/* Scattered chaos pills — vacuum toward columns during gather */}
      {HERO_TIMELINE_TASKS.map((task) => (
        <VacuumScatterPill
          key={`scatter-${task.id}`}
          task={task}
          smoothProgress={smoothProgress}
          floatActive={floatActive}
        />
      ))}

      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ left: TRACK_LEFT }}
      >
        <StructuredDayColumn side="left" tasks={trackTasks.left} smoothProgress={smoothProgress} />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 translate-x-1/2"
        style={{ right: TRACK_RIGHT }}
      >
        <StructuredDayColumn side="right" tasks={trackTasks.right} smoothProgress={smoothProgress} />
      </div>

      {/* All pills fall from slots into demo intake */}
      {HERO_TIMELINE_TASKS.map((task) => (
        <HeroDepositPill key={`deposit-${task.id}`} task={task} smoothProgress={smoothProgress} />
      ))}
    </div>
  );
}

function StaticDualTrack({ className }: { className?: string }) {
  const leftTasks = HERO_TIMELINE_TASKS.filter((t) => t.track === 'left').sort(
    (a, b) => a.order - b.order,
  );
  const rightTasks = HERO_TIMELINE_TASKS.filter((t) => t.track === 'right').sort(
    (a, b) => a.order - b.order,
  );

  return (
    <div
      className={cn('relative flex items-center justify-center gap-6 py-8 sm:gap-8', className)}
      aria-hidden
    >
      <StructuredDayColumn side="left" tasks={leftTasks} landed />
      <StructuredDayColumn side="right" tasks={rightTasks} landed />
    </div>
  );
}

export function ElasticTimeStream({
  smoothProgress,
  className,
  variant = 'desktop',
}: ElasticTimeStreamProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <StaticDualTrack className={className} />;
  }

  return (
    <ScrollLinkedStream
      smoothProgress={smoothProgress}
      className={className}
      compact={variant === 'mobile'}
    />
  );
}
