'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';
import {
  HERO_TRACK_BLOCKS,
  HERO_TRACK_DAY,
  type HeroTimelineTask,
} from '@/components/landing-v2/demo/fixtures';
import { cn } from '@/lib/utils';
import { easeOutQuint, HERO_VACUUM_PHASES, lerp, slotFadeT } from './useHeroVacuumProgress';
import {
  blockHeightPx,
  blockTopY,
  compactBodyHeight,
  RAIL_PADDING_BOTTOM,
  SLOT_AREA_LEFT,
  SLOT_AREA_WIDTH,
  slotHeightPx,
  slotTopY,
  TIMELINE_TICK_WIDTH,
} from './heroTimelineLayout';
import { PhoneFrame } from './PhoneFrame';
import { ColumnDropPill, ColumnStaticPill, SlotGhost } from './ColumnDropPill';

interface StructuredDayColumnProps {
  side: 'left' | 'right';
  tasks: HeroTimelineTask[];
  smoothProgress?: MotionValue<number>;
  landed?: boolean;
  className?: string;
}

function DayColumnHeader({ side }: { side: 'left' | 'right' }) {
  const day = HERO_TRACK_DAY[side];
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-line)]/60 px-3 py-2">
      <span className="text-[11px] font-semibold tracking-tight text-[var(--color-ink)]">
        {day.label}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-soft)]">
        {day.sub}
      </span>
    </div>
  );
}

function AnimatedTimeTick({
  time,
  top,
  smoothProgress,
}: {
  time: string;
  top: number;
  smoothProgress: MotionValue<number>;
}) {
  const opacity = useTransform(smoothProgress, (p) => {
    const fade = slotFadeT(p);
    return fade > 0 ? lerp(1, 0, fade) : 1;
  });

  return (
    <motion.div
      className="pointer-events-none absolute left-0 flex items-center gap-1"
      style={{ top: top - 6, width: TIMELINE_TICK_WIDTH, opacity }}
    >
      <span className="w-[34px] text-right font-mono text-[9px] leading-none text-[var(--color-ink-soft)]">
        {time}
      </span>
      <span className="h-px w-2 bg-[var(--color-line)]" aria-hidden />
    </motion.div>
  );
}

function TimeTick({ time, top }: { time: string; top: number }) {
  return (
    <div
      className="pointer-events-none absolute left-0 flex items-center gap-1"
      style={{ top: top - 6, width: TIMELINE_TICK_WIDTH }}
    >
      <span className="w-[34px] text-right font-mono text-[9px] leading-none text-[var(--color-ink-soft)]">
        {time}
      </span>
      <span className="h-px w-2 bg-[var(--color-line)]" aria-hidden />
    </div>
  );
}

function AnimatedTimelineSpine({
  height,
  smoothProgress,
}: {
  height: number;
  smoothProgress: MotionValue<number>;
}) {
  const opacity = useTransform(smoothProgress, (p) => {
    const fade = slotFadeT(p);
    return fade > 0 ? lerp(1, 0, fade) : 1;
  });

  return (
    <motion.div
      className="pointer-events-none absolute w-px bg-[var(--color-line)]/70"
      style={{ left: TIMELINE_TICK_WIDTH - 2, top: 0, height, opacity }}
      aria-hidden
    />
  );
}

function TimelineSpine({ height }: { height: number }) {
  return (
    <div
      className="pointer-events-none absolute w-px bg-[var(--color-line)]/70"
      style={{ left: TIMELINE_TICK_WIDTH - 2, top: 0, height }}
      aria-hidden
    />
  );
}

function CommitmentDivider({
  label,
  top,
  reveal,
}: {
  label: string;
  top: number;
  reveal: number | MotionValue<number>;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute overflow-hidden rounded-md border border-[var(--color-line)]/50 bg-[var(--color-cream-2)]/80"
      style={{
        top,
        left: SLOT_AREA_LEFT,
        width: SLOT_AREA_WIDTH,
        height: blockHeightPx(),
        opacity: reveal,
      }}
    >
      <span className="absolute inset-0 flex items-center px-2 text-[7px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
        {label}
      </span>
    </motion.div>
  );
}

function AnimatedColumnBody({
  side,
  tasks,
  smoothProgress,
}: {
  side: 'left' | 'right';
  tasks: HeroTimelineTask[];
  smoothProgress: MotionValue<number>;
}) {
  const blockLabels = HERO_TRACK_BLOCKS[side];
  const bodyHeight = compactBodyHeight(tasks.length);
  const { gatherEnd, organizeEnd } = HERO_VACUUM_PHASES;

  const blockReveal = useTransform(smoothProgress, (p) => {
    const fade = slotFadeT(p);
    if (fade > 0) return lerp(0.85, 0, fade);
    if (p <= gatherEnd) return 0;
    if (p <= organizeEnd) {
      return lerp(0, 0.85, easeOutQuint((p - gatherEnd) / (organizeEnd - gatherEnd)));
    }
    return 0.85;
  });

  return (
    <div className="relative" style={{ height: bodyHeight, paddingBottom: RAIL_PADDING_BOTTOM }}>
      <AnimatedTimelineSpine height={bodyHeight} smoothProgress={smoothProgress} />
      {tasks.map((task) => (
        <AnimatedTimeTick
          key={`tick-${task.id}`}
          time={task.slotTime}
          top={slotTopY(task.order) + slotHeightPx() / 2}
          smoothProgress={smoothProgress}
        />
      ))}
      {blockLabels.slice(0, tasks.length - 1).map((label, index) => (
        <CommitmentDivider
          key={`${side}-block-${label}`}
          label={label}
          top={blockTopY(index)}
          reveal={blockReveal}
        />
      ))}
      {tasks.map((task) => (
        <SlotGhost key={`ghost-${task.id}`} order={task.order} smoothProgress={smoothProgress} />
      ))}
      {tasks.map((task) => (
        <ColumnDropPill
          key={`pill-${task.id}`}
          task={task}
          smoothProgress={smoothProgress}
          trackCount={tasks.length}
        />
      ))}
    </div>
  );
}

function StaticColumnBody({ side, tasks }: { side: 'left' | 'right'; tasks: HeroTimelineTask[] }) {
  const blockLabels = HERO_TRACK_BLOCKS[side];
  const bodyHeight = compactBodyHeight(tasks.length);

  return (
    <div className="relative" style={{ height: bodyHeight, paddingBottom: RAIL_PADDING_BOTTOM }}>
      <TimelineSpine height={bodyHeight} />
      {tasks.map((task) => (
        <TimeTick key={`tick-${task.id}`} time={task.slotTime} top={slotTopY(task.order) + slotHeightPx() / 2} />
      ))}
      {blockLabels.slice(0, tasks.length - 1).map((label, index) => (
        <CommitmentDivider key={`${side}-block-${label}`} label={label} top={blockTopY(index)} reveal={0.85} />
      ))}
      {tasks.map((task) => (
        <ColumnStaticPill key={`pill-${task.id}`} task={task} />
      ))}
    </div>
  );
}

function ColumnBody({
  side,
  tasks,
  smoothProgress,
}: {
  side: 'left' | 'right';
  tasks: HeroTimelineTask[];
  smoothProgress?: MotionValue<number>;
}) {
  if (smoothProgress) {
    return <AnimatedColumnBody side={side} tasks={tasks} smoothProgress={smoothProgress} />;
  }
  return <StaticColumnBody side={side} tasks={tasks} />;
}

function AnimatedStructuredDayColumn({
  side,
  tasks,
  smoothProgress,
  className,
}: {
  side: 'left' | 'right';
  tasks: HeroTimelineTask[];
  smoothProgress: MotionValue<number>;
  className?: string;
}) {
  const { gatherEnd, organizeEnd, payoffEnd } = HERO_VACUUM_PHASES;

  const railOpacity = useTransform(smoothProgress, (p) => {
    if (p <= gatherEnd - 0.12) return 0;
    if (p <= gatherEnd) {
      return lerp(0, 0.92, easeOutQuint((p - (gatherEnd - 0.12)) / 0.12));
    }
    const fade = slotFadeT(p);
    if (fade > 0) return lerp(1, 0, fade);
    return 1;
  });

  const railScale = useTransform(smoothProgress, (p) => {
    if (p <= 0.35) return 0.88;
    if (p <= payoffEnd) {
      const t = easeOutQuint((p - 0.35) / (payoffEnd - 0.35));
      return lerp(0.88, 1, t);
    }
    return 1;
  });

  const glow = useTransform(smoothProgress, [organizeEnd, payoffEnd], [0, 8]);
  const boxShadow = useTransform(glow, (g) =>
    g > 0 ? `0 4px ${g}px color-mix(in srgb, var(--color-ocean) 24%, transparent)` : 'none',
  );

  return (
    <motion.div
      className={cn('pointer-events-none', className)}
      style={{ opacity: railOpacity, scale: railScale }}
    >
      <PhoneFrame>
        <motion.div style={{ boxShadow }} className="relative">
          <DayColumnHeader side={side} />
          <ColumnBody side={side} tasks={tasks} smoothProgress={smoothProgress} />
        </motion.div>
      </PhoneFrame>
    </motion.div>
  );
}

function StaticStructuredDayColumn({
  side,
  tasks,
  className,
}: {
  side: 'left' | 'right';
  tasks: HeroTimelineTask[];
  className?: string;
}) {
  return (
    <div className={cn('pointer-events-none', className)}>
      <PhoneFrame>
        <div className="relative">
          <DayColumnHeader side={side} />
          <ColumnBody side={side} tasks={tasks} />
        </div>
      </PhoneFrame>
    </div>
  );
}

export function StructuredDayColumn({
  side,
  tasks,
  smoothProgress,
  landed = false,
  className,
}: StructuredDayColumnProps) {
  if (smoothProgress && !landed) {
    return (
      <AnimatedStructuredDayColumn
        side={side}
        tasks={tasks}
        smoothProgress={smoothProgress}
        className={className}
      />
    );
  }

  return <StaticStructuredDayColumn side={side} tasks={tasks} className={className} />;
}
