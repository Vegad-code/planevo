'use client';

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  HERO_PILL_TONES,
  HERO_TIMELINE_TASKS,
  HERO_TRACK_BLOCKS,
  HERO_TRACK_DAY,
  type HeroTimelineTask,
} from '@/components/landing-v2/demo/fixtures';
import { cn } from '@/lib/utils';
import {
  easeInQuad,
  easeOutCubic,
  easeOutQuint,
  HERO_VACUUM_PHASES,
  lerp,
  pillDepositStart,
  pillFocalX,
  PILL_FOCAL_Y,
  pillWindow,
} from './useHeroVacuumProgress';

const SLOT_HEIGHT = 50;
const BLOCK_HEIGHT = 20;
const SLOT_STEP = SLOT_HEIGHT + BLOCK_HEIGHT;
const RAIL_WIDTH = 252;
const RAIL_HEADER = 38;
const RAIL_PADDING = 14;
const SLOT_AREA_LEFT = 50;
const SLOT_AREA_WIDTH = RAIL_WIDTH - SLOT_AREA_LEFT - 10;
const PILL_SLOT_WIDTH = SLOT_AREA_WIDTH - 4;
/** Horizontal offset from rail center to slot center (pills snap here). */
const SLOT_CENTER_X = SLOT_AREA_LEFT + PILL_SLOT_WIDTH / 2 - RAIL_WIDTH / 2;
const TRACK_LEFT = '17%';
const TRACK_RIGHT = '17%';
const PILL_SHELL_CLASS =
  'relative flex h-[50px] items-center justify-center gap-2 rounded-xl px-3 text-[14px] shadow-[0_2px_12px_rgba(47,90,174,0.12)]';

function railHeightForSlots(slotCount: number): number {
  const body = SLOT_HEIGHT + (slotCount - 1) * SLOT_STEP;
  return RAIL_HEADER + RAIL_PADDING * 2 + body;
}

function slotTop(order: number): number {
  return RAIL_HEADER + RAIL_PADDING + order * SLOT_STEP;
}

function blockTop(order: number): number {
  return slotTop(order) + SLOT_HEIGHT;
}

function slotCenterY(order: number, trackCount: number): number {
  const baseHeight = railHeightForSlots(trackCount);
  return -baseHeight / 2 + slotTop(order) + SLOT_HEIGHT / 2;
}

interface ElasticTimeStreamProps {
  smoothProgress: MotionValue<number>;
  className?: string;
  variant?: 'desktop' | 'mobile';
}

function TaskPillContent({ label, meta }: { label: string; meta: string }) {
  return (
    <span className="min-w-0 truncate">
      <span className="font-medium text-[var(--color-ink)]">{label}</span>
      {meta ? (
        <span className="text-[var(--color-ink-soft)]"> · {meta}</span>
      ) : null}
    </span>
  );
}

/** Staggered snap — each pill lands in its slot sequentially. */
function snapIntoSlotY(
  progress: number,
  gatherEnd: number,
  organizeEnd: number,
  order: number,
  trackCount: number,
  fromY: number,
  settledY: number,
): number {
  const phaseSpan = organizeEnd - gatherEnd;
  const landStart = gatherEnd + (phaseSpan * order) / trackCount;
  const landEnd = landStart + phaseSpan / trackCount;

  if (progress <= landStart) {
    const t = easeOutQuint((progress - gatherEnd) / Math.max(0.001, landStart - gatherEnd));
    return lerp(fromY, settledY, t * 0.35);
  }
  if (progress <= landEnd) {
    const t = easeOutQuint((progress - landStart) / Math.max(0.001, landEnd - landStart));
    const partial = lerp(fromY, settledY, 0.35);
    const eased = lerp(partial, settledY, t);
    // Tiny settle bounce as the pill clicks into its slot.
    if (t > 0.85) {
      const bounce = Math.sin((t - 0.85) / 0.15 * Math.PI) * 3 * (1 - t);
      return eased - bounce;
    }
    return eased;
  }
  return settledY;
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

function TimeTick({ time, top }: { time: string; top: number }) {
  return (
    <div
      className="pointer-events-none absolute left-0 flex w-[46px] items-center gap-1"
      style={{ top: top - 6 }}
    >
      <span className="w-[34px] text-right font-mono text-[9px] leading-none text-[var(--color-ink-soft)]">
        {time}
      </span>
      <span className="h-px w-2 bg-[var(--color-line)]" aria-hidden />
    </div>
  );
}

function BlockedStrip({
  label,
  top,
  reveal,
}: {
  label: string;
  top: number;
  reveal: MotionValue<number>;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute overflow-hidden rounded-md border border-[var(--color-line)]/70 bg-[var(--color-cream-2)]"
      style={{
        top,
        left: SLOT_AREA_LEFT,
        width: SLOT_AREA_WIDTH,
        height: BLOCK_HEIGHT,
        opacity: reveal,
        backgroundImage:
          'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(112,110,100,0.08) 3px, rgba(112,110,100,0.08) 6px)',
      }}
    >
      <span className="absolute inset-0 flex items-center px-2 text-[8px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
        {label}
      </span>
    </motion.div>
  );
}

function AvailabilityGapSlot({
  task,
  index,
  slotCount,
  smoothProgress,
}: {
  task: HeroTimelineTask;
  index: number;
  slotCount: number;
  smoothProgress: MotionValue<number>;
}) {
  const { gatherEnd, organizeEnd } = HERO_VACUUM_PHASES;
  const top = slotTop(index);

  const slotReveal = useTransform(smoothProgress, (p) => {
    if (p <= gatherEnd - 0.1) return 0;
    if (p <= gatherEnd) {
      return lerp(0, 0.7, easeOutQuint((p - (gatherEnd - 0.1)) / 0.1));
    }
    return 0.7;
  });

  const slotFill = useTransform(smoothProgress, (p) => {
    const slotThreshold = gatherEnd + ((organizeEnd - gatherEnd) * (index + 1)) / slotCount;
    if (p <= gatherEnd) return 0.35;
    if (p <= slotThreshold) {
      return lerp(0.35, 1, easeOutQuint((p - gatherEnd) / (slotThreshold - gatherEnd)));
    }
    return 1;
  });

  const labelFade = useTransform(smoothProgress, (p) => {
    const slotThreshold = gatherEnd + ((organizeEnd - gatherEnd) * (index + 0.6)) / slotCount;
    if (p <= slotThreshold) return 1;
    return lerp(1, 0, easeOutQuint((p - slotThreshold) / 0.08));
  });

  const dashedBorder = useTransform(smoothProgress, (p) => {
    if (p <= gatherEnd) return 1;
    if (p <= organizeEnd) {
      return lerp(1, 0, easeOutQuint((p - gatherEnd) / (organizeEnd - gatherEnd)));
    }
    return 0;
  });

  return (
    <>
      <TimeTick time={task.slotTime} top={top + SLOT_HEIGHT / 2} />
      <motion.div
        className="absolute overflow-hidden rounded-xl border border-[var(--color-honey)]/35 bg-[var(--color-honey-soft)]/80"
        style={{
          top,
          left: SLOT_AREA_LEFT,
          width: SLOT_AREA_WIDTH,
          height: SLOT_HEIGHT,
          opacity: slotReveal,
        }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl border border-dashed border-[var(--color-honey-deep)]/45"
          style={{ opacity: dashedBorder }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--color-honey-soft)]"
          style={{ opacity: slotFill }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-between px-2.5"
          style={{ opacity: labelFade }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-honey-deep)]/80">
            Open gap
          </span>
          <span className="font-mono text-[9px] font-bold text-[var(--color-honey-deep)]">
            {task.slotDuration}
          </span>
        </motion.div>
      </motion.div>
    </>
  );
}

function AvailabilityRail({
  side,
  smoothProgress,
  tasks,
}: {
  side: 'left' | 'right';
  smoothProgress: MotionValue<number>;
  tasks: HeroTimelineTask[];
}) {
  const slotCount = tasks.length;
  const blocks = HERO_TRACK_BLOCKS[side];
  const { gatherEnd, organizeEnd, payoffEnd, depositEnd } = HERO_VACUUM_PHASES;
  const baseHeight = railHeightForSlots(slotCount);

  const railScale = useTransform(smoothProgress, (p) => {
    if (p <= 0.5) return 0.84;
    if (p <= payoffEnd) {
      const t = easeOutQuint((p - 0.5) / (payoffEnd - 0.5));
      return lerp(0.84, 1, t);
    }
    const fade = easeOutCubic((p - payoffEnd) / (depositEnd - payoffEnd));
    return lerp(1, 0.65, fade);
  });

  const railOpacity = useTransform(smoothProgress, (p) => {
    if (p <= gatherEnd - 0.08) return 0;
    if (p <= gatherEnd) {
      return lerp(0, 0.85, easeOutQuint((p - (gatherEnd - 0.08)) / 0.08));
    }
    if (p <= payoffEnd) {
      return lerp(0.85, 1, easeOutQuint((p - gatherEnd) / (payoffEnd - gatherEnd)));
    }
    return lerp(1, 0, easeOutCubic((p - payoffEnd) / (depositEnd - payoffEnd)));
  });

  const blockReveal = useTransform(smoothProgress, (p) => {
    if (p <= gatherEnd) return 0;
    if (p <= organizeEnd) {
      return lerp(0, 0.9, easeOutQuint((p - gatherEnd) / (organizeEnd - gatherEnd)));
    }
    return 0.9;
  });

  const glow = useTransform(smoothProgress, [organizeEnd, payoffEnd], [0, 10]);
  const boxShadow = useTransform(glow, (g) =>
    g > 0 ? `0 4px ${g}px color-mix(in srgb, var(--color-ocean) 28%, transparent)` : 'none',
  );

  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute top-1/2 -translate-y-1/2',
        side === 'left' ? '-translate-x-1/2' : 'translate-x-1/2',
      )}
      style={{
        left: side === 'left' ? TRACK_LEFT : undefined,
        right: side === 'right' ? TRACK_RIGHT : undefined,
        opacity: railOpacity,
        scale: railScale,
        zIndex: 5,
      }}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] shadow-[0_8px_32px_rgba(47,90,174,0.08)]"
        style={{ width: RAIL_WIDTH, height: baseHeight, boxShadow }}
      >
        <DayColumnHeader side={side} />
        <div className="relative" style={{ height: baseHeight - RAIL_HEADER }}>
          {tasks.map((task, index) => (
            <AvailabilityGapSlot
              key={task.id}
              task={task}
              index={index}
              slotCount={slotCount}
              smoothProgress={smoothProgress}
            />
          ))}
          {blocks.slice(0, slotCount - 1).map((label, index) => (
            <BlockedStrip
              key={`${side}-block-${index}`}
              label={label}
              top={blockTop(index)}
              reveal={blockReveal}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function VacuumPill({
  task,
  smoothProgress,
  trackCount,
  floatActive,
  disableBlur,
}: {
  task: HeroTimelineTask;
  smoothProgress: MotionValue<number>;
  trackCount: number;
  floatActive: boolean;
  disableBlur: boolean;
}) {
  const tone = HERO_PILL_TONES[task.tone];
  const window = pillWindow(task);
  const focalX = pillFocalX(task);

  const x = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd, organizeEnd } = window;
    if (progress <= start) return task.startX;
    if (progress <= gatherEnd) {
      const t = easeOutQuint((progress - start) / (gatherEnd - start));
      return lerp(task.startX, focalX, t);
    }
    if (progress <= organizeEnd) {
      const t = easeOutQuint((progress - gatherEnd) / (organizeEnd - gatherEnd));
      return lerp(focalX, SLOT_CENTER_X, t);
    }
    return SLOT_CENTER_X;
  });

  const y = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd, organizeEnd } = window;
    const settled = slotCenterY(task.order, trackCount);
    if (progress <= start) return task.startY;
    if (progress <= gatherEnd) {
      const t = easeOutQuint((progress - start) / (gatherEnd - start));
      return lerp(task.startY, PILL_FOCAL_Y, t);
    }
    if (progress <= organizeEnd) {
      return snapIntoSlotY(
        progress,
        gatherEnd,
        organizeEnd,
        task.order,
        trackCount,
        PILL_FOCAL_Y,
        settled,
      );
    }

    const { payoffEnd, scatterEnd, depositEnd } = HERO_VACUUM_PHASES;
    const depositStart = pillDepositStart(task);
    const liftY = settled - 14;
    if (progress <= payoffEnd) return settled;
    if (progress <= depositStart) return settled;
    if (progress <= scatterEnd) {
      const t = easeOutCubic((progress - depositStart) / (scatterEnd - depositStart));
      return lerp(settled, liftY, t);
    }
    if (progress <= depositEnd) {
      const t = easeInQuad((progress - scatterEnd) / (depositEnd - scatterEnd));
      return lerp(liftY, settled + task.depositY, t);
    }
    return settled + task.depositY;
  });

  const rotate = useTransform(smoothProgress, (progress) => {
    const { start, organizeEnd } = window;
    if (progress <= start) return task.rotate;
    if (progress <= organizeEnd) {
      const t = easeOutQuint((progress - start) / (organizeEnd - start));
      return lerp(task.rotate, 0, t);
    }

    const { payoffEnd, scatterEnd, depositEnd } = HERO_VACUUM_PHASES;
    const depositStart = pillDepositStart(task);
    const targetRotate = task.rotate * 0.15;
    if (progress <= payoffEnd) return 0;
    if (progress <= scatterEnd) {
      const t = easeOutCubic((progress - depositStart) / (scatterEnd - depositStart));
      return lerp(0, targetRotate, Math.min(1, Math.max(0, t)));
    }
    if (progress <= depositEnd) {
      const t = easeInQuad((progress - scatterEnd) / (depositEnd - scatterEnd));
      return lerp(targetRotate, targetRotate * 0.5, t);
    }
    return targetRotate * 0.5;
  });

  const opacity = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd } = window;
    if (progress <= start) return 0.38;
    if (progress <= gatherEnd) {
      const t = easeOutQuint((progress - start) / (gatherEnd - start));
      return lerp(0.38, 1, t);
    }

    const { scatterEnd, depositEnd } = HERO_VACUUM_PHASES;
    if (progress <= scatterEnd) return 1;
    if (progress <= depositEnd) {
      const t = easeInQuad((progress - scatterEnd) / (depositEnd - scatterEnd));
      return lerp(1, 0, t);
    }
    return 0;
  });

  const { organizeEnd: phaseOrganizeEnd, payoffEnd } = HERO_VACUUM_PHASES;

  const scale = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd, organizeEnd } = window;
    let base = 1;
    if (progress <= start) base = 0.88;
    else if (progress <= gatherEnd) {
      const t = easeOutQuint((progress - start) / (gatherEnd - start));
      base = lerp(0.88, 0.96, t);
    } else if (progress <= organizeEnd) {
      const t = easeOutQuint((progress - gatherEnd) / (organizeEnd - gatherEnd));
      base = lerp(0.96, 1, t);
    }
    if (progress > phaseOrganizeEnd && progress <= payoffEnd) {
      const mid = (phaseOrganizeEnd + payoffEnd) / 2;
      if (progress <= mid) {
        const t = easeOutQuint((progress - phaseOrganizeEnd) / (mid - phaseOrganizeEnd));
        return base * lerp(1, 1.03, t);
      }
      const t = easeOutQuint((progress - mid) / (payoffEnd - mid));
      return base * lerp(1.03, 1, t);
    }
    const { scatterEnd, depositEnd } = HERO_VACUUM_PHASES;
    if (progress > scatterEnd && progress <= depositEnd) {
      const t = easeInQuad((progress - scatterEnd) / (depositEnd - scatterEnd));
      return base * lerp(1, 0.88, t);
    }
    return base;
  });

  const blurPx = useTransform(smoothProgress, (progress) => {
    if (disableBlur) return 0;
    const { start, gatherEnd } = window;
    if (progress <= start) return 5;
    if (progress <= gatherEnd) {
      const t = easeOutQuint((progress - start) / (gatherEnd - start));
      return lerp(5, 0, t);
    }
    return 0;
  });

  const filter = useTransform(blurPx, (b) => (b > 0 ? `blur(${b}px)` : 'none'));

  const dashedOpacity = useTransform(smoothProgress, (progress) => {
    const mid = (window.gatherEnd + window.organizeEnd) / 2;
    if (progress <= window.gatherEnd) return 1;
    if (progress <= mid) {
      return lerp(1, 0, easeOutQuint((progress - window.gatherEnd) / (mid - window.gatherEnd)));
    }
    return 0;
  });

  const solidOpacity = useTransform(smoothProgress, (progress) => {
    const mid = (window.gatherEnd + window.organizeEnd) / 2;
    if (progress <= window.gatherEnd) return 0;
    if (progress <= mid) {
      return lerp(0, 1, easeOutQuint((progress - window.gatherEnd) / (mid - window.gatherEnd)));
    }
    return 1;
  });

  return (
    <motion.div
      className={cn(
        'absolute top-1/2 whitespace-nowrap will-change-transform',
        task.track === 'left' ? '-translate-x-1/2' : 'translate-x-1/2',
      )}
      style={{
        left: task.track === 'left' ? TRACK_LEFT : undefined,
        right: task.track === 'right' ? TRACK_RIGHT : undefined,
        zIndex: 20 + task.order,
        x,
        y,
        rotate,
        opacity,
        scale,
        filter,
      }}
    >
      <motion.div
        animate={floatActive ? { translateY: [0, -4, 0] } : undefined}
        transition={
          floatActive
            ? {
                delay: task.delay,
                duration: 2.8,
                ease: 'easeInOut',
                times: [0, 0.5, 1],
                repeat: Infinity,
              }
            : undefined
        }
        className={PILL_SHELL_CLASS}
        style={{
          backgroundColor: tone.bg,
          width: PILL_SLOT_WIDTH,
          height: SLOT_HEIGHT,
        }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl border border-dashed"
          style={{ borderColor: tone.border, opacity: dashedOpacity }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl border"
          style={{ borderColor: tone.border, opacity: solidOpacity }}
        />
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: tone.dot }}
          aria-hidden
        />
        <TaskPillContent label={task.label} meta={task.meta} />
      </motion.div>
    </motion.div>
  );
}

function StaticPill({ task }: { task: HeroTimelineTask }) {
  const tone = HERO_PILL_TONES[task.tone];
  return (
    <div
      className={cn(PILL_SHELL_CLASS, 'relative z-10 w-full border')}
      style={{
        backgroundColor: tone.bg,
        borderColor: tone.border,
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: tone.dot }}
        aria-hidden
      />
      <TaskPillContent label={task.label} meta={task.meta} />
    </div>
  );
}

function MobileEntrancePill({ task }: { task: HeroTimelineTask }) {
  const tone = HERO_PILL_TONES[task.tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        delay: task.delay,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(PILL_SHELL_CLASS, 'relative z-10 w-full border')}
      style={{
        backgroundColor: tone.bg,
        borderColor: tone.border,
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: tone.dot }}
        aria-hidden
      />
      <TaskPillContent label={task.label} meta={task.meta} />
    </motion.div>
  );
}

function StaticRail({ side, tasks }: { side: 'left' | 'right'; tasks: HeroTimelineTask[] }) {
  const slotCount = tasks.length;
  const blocks = HERO_TRACK_BLOCKS[side];
  const height = railHeightForSlots(slotCount);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] shadow-[0_8px_32px_rgba(47,90,174,0.08)]"
      style={{ width: RAIL_WIDTH, height }}
    >
      <DayColumnHeader side={side} />
      <div className="relative" style={{ height: height - RAIL_HEADER }}>
        {tasks.map((task, index) => (
          <div key={task.id}>
            <TimeTick time={task.slotTime} top={slotTop(index) + SLOT_HEIGHT / 2} />
            <div
              className="absolute rounded-xl border border-[var(--color-honey)]/35 bg-[var(--color-honey-soft)]/80"
              style={{
                top: slotTop(index),
                left: SLOT_AREA_LEFT,
                width: SLOT_AREA_WIDTH,
                height: SLOT_HEIGHT,
              }}
            >
              <div className="flex h-full items-center justify-between px-2.5">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-honey-deep)]/80">
                  Open gap
                </span>
                <span className="font-mono text-[9px] font-bold text-[var(--color-honey-deep)]">
                  {task.slotDuration}
                </span>
              </div>
            </div>
          </div>
        ))}
        {blocks.slice(0, slotCount - 1).map((label, index) => (
          <div
            key={`${side}-block-${index}`}
            className="absolute overflow-hidden rounded-md border border-[var(--color-line)]/70 bg-[var(--color-cream-2)]"
            style={{
              top: blockTop(index),
              left: SLOT_AREA_LEFT,
              width: SLOT_AREA_WIDTH,
              height: BLOCK_HEIGHT,
              backgroundImage:
                'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(112,110,100,0.08) 3px, rgba(112,110,100,0.08) 6px)',
            }}
          >
            <span className="absolute inset-0 flex items-center px-2 text-[8px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaticTrackColumn({ side, tasks }: { side: 'left' | 'right'; tasks: HeroTimelineTask[] }) {
  return (
    <div className="relative flex flex-col items-center" style={{ width: RAIL_WIDTH }}>
      <StaticRail side={side} tasks={tasks} />
      <div className="pointer-events-none absolute inset-0">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="absolute flex items-center justify-center"
            style={{
              top: slotTop(task.order),
              left: SLOT_AREA_LEFT + 2,
              width: PILL_SLOT_WIDTH,
              height: SLOT_HEIGHT,
            }}
          >
            <StaticPill task={task} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileTrackColumn({ side, tasks }: { side: 'left' | 'right'; tasks: HeroTimelineTask[] }) {
  return (
    <div className="relative flex flex-col items-center" style={{ width: RAIL_WIDTH }}>
      <StaticRail side={side} tasks={tasks} />
      <div className="pointer-events-none absolute inset-0">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="absolute flex items-center justify-center"
            style={{
              top: slotTop(task.order),
              left: SLOT_AREA_LEFT + 2,
              width: PILL_SLOT_WIDTH,
              height: SLOT_HEIGHT,
            }}
          >
            <MobileEntrancePill task={task} />
          </div>
        ))}
      </div>
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
      className={cn('relative flex items-center justify-center gap-8 py-8', className)}
      aria-hidden
    >
      <StaticTrackColumn side="left" tasks={leftTasks} />
      <StaticTrackColumn side="right" tasks={rightTasks} />
    </div>
  );
}

function MobileEntranceTrack({ className }: { className?: string }) {
  const leftTasks = HERO_TIMELINE_TASKS.filter((t) => t.track === 'left').sort(
    (a, b) => a.order - b.order,
  );
  const rightTasks = HERO_TIMELINE_TASKS.filter((t) => t.track === 'right').sort(
    (a, b) => a.order - b.order,
  );

  return (
    <div
      className={cn('relative flex items-center justify-center gap-6 py-4 sm:gap-8', className)}
      aria-hidden
    >
      <MobileTrackColumn side="left" tasks={leftTasks} />
      <MobileTrackColumn side="right" tasks={rightTasks} />
    </div>
  );
}

function DesktopVacuumStream({
  smoothProgress,
  className,
}: {
  smoothProgress: MotionValue<number>;
  className?: string;
}) {
  const [floatActive, setFloatActive] = useState(true);
  const reduce = useReducedMotion();

  const trackTasks = useMemo(
    () => ({
      left: HERO_TIMELINE_TASKS.filter((t) => t.track === 'left').sort((a, b) => a.order - b.order),
      right: HERO_TIMELINE_TASKS.filter((t) => t.track === 'right').sort((a, b) => a.order - b.order),
    }),
    [],
  );

  const trackCounts = useMemo(
    () => ({
      left: trackTasks.left.length,
      right: trackTasks.right.length,
    }),
    [trackTasks],
  );

  useMotionValueEvent(smoothProgress, 'change', (v) => {
    if (v > 0.02) setFloatActive(false);
  });

  return (
    <div className={cn('relative h-full w-full', className)} aria-hidden>
      <AvailabilityRail side="left" smoothProgress={smoothProgress} tasks={trackTasks.left} />
      <AvailabilityRail side="right" smoothProgress={smoothProgress} tasks={trackTasks.right} />
      {HERO_TIMELINE_TASKS.map((task) => (
        <VacuumPill
          key={task.id}
          task={task}
          smoothProgress={smoothProgress}
          trackCount={trackCounts[task.track]}
          floatActive={floatActive}
          disableBlur={reduce ?? false}
        />
      ))}
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

  if (variant === 'mobile') {
    return <MobileEntranceTrack className={className} />;
  }

  return (
    <div className={cn('relative h-full w-full', className)}>
      <DesktopVacuumStream smoothProgress={smoothProgress} />
    </div>
  );
}
