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
  type HeroTimelineTask,
} from '@/components/landing-v2/demo/fixtures';
import { cn } from '@/lib/utils';
import {
  easeOutCubic,
  easeOutQuint,
  HERO_VACUUM_PHASES,
  lerp,
  pillFocalX,
  PILL_FOCAL_Y,
  pillWindow,
} from './useHeroVacuumProgress';

const PILL_HEIGHT = 44;
const TRACK_LEFT = '22%';
const TRACK_RIGHT = '22%';

interface ElasticTimeStreamProps {
  smoothProgress: MotionValue<number>;
  className?: string;
  variant?: 'desktop' | 'mobile';
}

function TaskPillContent({ label, meta }: { label: string; meta: string }) {
  return (
    <>
      <span className="font-medium text-[var(--color-ink)]">{label}</span>
      {meta ? (
        <span className="text-[var(--color-ink-soft)]"> · {meta}</span>
      ) : null}
    </>
  );
}

function stackOffset(order: number, trackCount: number, gap: number): number {
  const totalHeight = (trackCount - 1) * (PILL_HEIGHT + gap) + PILL_HEIGHT;
  return -totalHeight / 2 + order * (PILL_HEIGHT + gap);
}

function DualAxis({ smoothProgress }: { smoothProgress: MotionValue<number> }) {
  const { organizeEnd, payoffEnd } = HERO_VACUUM_PHASES;
  const axisHeight = useTransform(smoothProgress, (p) => {
    if (p <= payoffEnd) {
      const t = Math.min(1, Math.max(0, (p - 0.5) / (payoffEnd - 0.5)));
      return `${lerp(50, 78, easeOutQuint(t))}%`;
    }
    const fade = easeOutCubic((p - payoffEnd) / (1 - payoffEnd));
    return `${lerp(78, 0, fade)}%`;
  });
  const axisOpacity = useTransform(smoothProgress, (p) => {
    if (p <= organizeEnd) return lerp(0.4, 0.4, 0);
    if (p <= payoffEnd) {
      return lerp(0.4, 0.85, easeOutQuint((p - organizeEnd) / (payoffEnd - organizeEnd)));
    }
    return lerp(0.85, 0, easeOutCubic((p - payoffEnd) / (1 - payoffEnd)));
  });
  const axisGlow = useTransform(smoothProgress, [organizeEnd, payoffEnd], [0, 6]);

  const leftGlow = useTransform(axisGlow, (g) =>
    g > 0 ? `0 0 ${g}px color-mix(in srgb, var(--color-ocean) 40%, transparent)` : 'none',
  );
  const rightGlow = useTransform(axisGlow, (g) =>
    g > 0 ? `0 0 ${g}px color-mix(in srgb, var(--color-ocean) 40%, transparent)` : 'none',
  );

  return (
    <>
      <motion.div
        className="pointer-events-none absolute top-1/2 w-px -translate-y-1/2 bg-[var(--color-ocean)]"
        style={{ left: TRACK_LEFT, height: axisHeight, opacity: axisOpacity, boxShadow: leftGlow }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/2 w-px -translate-y-1/2 bg-[var(--color-ocean)]"
        style={{ right: TRACK_RIGHT, height: axisHeight, opacity: axisOpacity, boxShadow: rightGlow }}
      />
    </>
  );
}

function VacuumPill({
  task,
  smoothProgress,
  stackGap,
  trackCount,
  floatActive,
  disableBlur,
}: {
  task: HeroTimelineTask;
  smoothProgress: MotionValue<number>;
  stackGap: MotionValue<number>;
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
      return lerp(focalX, 0, t);
    }
    return 0;
  });

  const y = useTransform([smoothProgress, stackGap], ([progress, gap]) => {
    const { start, gatherEnd, organizeEnd } = window;
    const settled = stackOffset(task.order, trackCount, gap as number);
    const p = progress as number;
    if (p <= start) return task.startY;
    if (p <= gatherEnd) {
      const t = easeOutQuint((p - start) / (gatherEnd - start));
      return lerp(task.startY, PILL_FOCAL_Y, t);
    }
    if (p <= organizeEnd) {
      const t = easeOutQuint((p - gatherEnd) / (organizeEnd - gatherEnd));
      return lerp(PILL_FOCAL_Y, settled, t);
    }
    return settled;
  });

  const rotate = useTransform(smoothProgress, (progress) => {
    const { start, organizeEnd } = window;
    if (progress <= start) return task.rotate;
    if (progress <= organizeEnd) {
      const t = easeOutQuint((progress - start) / (organizeEnd - start));
      return lerp(task.rotate, 0, t);
    }
    return 0;
  });

  const opacity = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd, organizeEnd } = window;
    if (progress <= start) return 0.38;
    if (progress <= gatherEnd) {
      const t = easeOutQuint((progress - start) / (gatherEnd - start));
      return lerp(0.38, 1, t);
    }

    const { payoffEnd } = HERO_VACUUM_PHASES;
    if (progress <= organizeEnd) return 1;

    const dissolveStart = organizeEnd + task.order * 0.015;
    if (progress <= payoffEnd) {
      const span = Math.max(0.001, payoffEnd - dissolveStart);
      const t = easeOutCubic((progress - dissolveStart) / span);
      return lerp(1, 0, Math.min(1, Math.max(0, t)));
    }
    return 0;
  });

  const scale = useTransform(smoothProgress, (progress) => {
    const { start, organizeEnd } = window;
    let base = 1;
    if (progress <= start) base = 0.78;
    else if (progress <= organizeEnd) {
      const t = easeOutQuint((progress - start) / (organizeEnd - start));
      base = lerp(0.78, 1, t);
    }

    const { payoffEnd } = HERO_VACUUM_PHASES;
    if (progress > organizeEnd && progress <= payoffEnd) {
      const dissolveStart = organizeEnd + task.order * 0.015;
      const t = easeOutCubic((progress - dissolveStart) / Math.max(0.001, payoffEnd - dissolveStart));
      return base * lerp(1, 0.9, Math.min(1, Math.max(0, t)));
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
        className="relative rounded-full py-2 pl-3 pr-4 text-[13px] shadow-sm"
        style={{ backgroundColor: tone.bg }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full border border-dashed"
          style={{ borderColor: tone.border, opacity: dashedOpacity }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full border"
          style={{ borderColor: tone.border, opacity: solidOpacity }}
        />
        <span className="relative z-10 flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: tone.dot }}
            aria-hidden
          />
          <TaskPillContent label={task.label} meta={task.meta} />
        </span>
      </motion.div>
    </motion.div>
  );
}

function StaticPill({ task }: { task: HeroTimelineTask }) {
  const tone = HERO_PILL_TONES[task.tone];
  return (
    <div
      className="relative z-10 flex items-center gap-2 rounded-full py-2 pl-3 pr-4 text-[13px] shadow-sm"
      style={{ backgroundColor: tone.bg, borderColor: tone.border, borderWidth: 1 }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
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
      className="relative z-10 flex items-center gap-2 rounded-full border py-2 pl-3 pr-4 text-[13px] shadow-sm"
      style={{ backgroundColor: tone.bg, borderColor: tone.border }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: tone.dot }}
        aria-hidden
      />
      <TaskPillContent label={task.label} meta={task.meta} />
    </motion.div>
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
      <div className="relative flex flex-col items-center gap-2">
        <div className="absolute bottom-0 top-0 w-px bg-[var(--color-ocean)] opacity-40" />
        {leftTasks.map((task) => (
          <StaticPill key={task.id} task={task} />
        ))}
      </div>
      <div className="relative flex flex-col items-center gap-2">
        <div className="absolute bottom-0 top-0 w-px bg-[var(--color-ocean)] opacity-40" />
        {rightTasks.map((task) => (
          <StaticPill key={task.id} task={task} />
        ))}
      </div>
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
      <div className="relative flex flex-col items-center gap-2">
        <div className="absolute bottom-0 top-0 w-px bg-[var(--color-ocean)] opacity-40" />
        {leftTasks.map((task) => (
          <MobileEntrancePill key={task.id} task={task} />
        ))}
      </div>
      <div className="relative flex flex-col items-center gap-2">
        <div className="absolute bottom-0 top-0 w-px bg-[var(--color-ocean)] opacity-40" />
        {rightTasks.map((task) => (
          <MobileEntrancePill key={task.id} task={task} />
        ))}
      </div>
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
  const stackGap = useTransform(smoothProgress, [0.55, 1], [6, 22]);

  const trackCounts = useMemo(
    () => ({
      left: HERO_TIMELINE_TASKS.filter((t) => t.track === 'left').length,
      right: HERO_TIMELINE_TASKS.filter((t) => t.track === 'right').length,
    }),
    [],
  );

  useMotionValueEvent(smoothProgress, 'change', (v) => {
    if (v > 0.02) setFloatActive(false);
  });

  return (
    <div className={cn('relative h-full w-full', className)} aria-hidden>
      <DualAxis smoothProgress={smoothProgress} />
      {HERO_TIMELINE_TASKS.map((task) => (
        <VacuumPill
          key={task.id}
          task={task}
          smoothProgress={smoothProgress}
          stackGap={stackGap}
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
