'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';
import { HERO_PILL_TONES, type HeroTimelineTask } from '@/components/landing-v2/demo/fixtures';
import { cn } from '@/lib/utils';
import {
  gatherDropOffset,
  PILL_SLOT_WIDTH,
  slotCenterRelativeToPhoneCenter,
  slotHeightPx,
  TRACK_LEFT,
  TRACK_RIGHT,
} from './heroTimelineLayout';
import { easeOutQuint, HERO_VACUUM_PHASES, lerp, pillWindow } from './useHeroVacuumProgress';

const PILL_SHELL_CLASS =
  'relative flex items-center justify-center gap-2 rounded-xl px-3 text-[14px] shadow-[0_2px_12px_rgba(47,90,174,0.12)]';

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

/**
 * Hero-level scattered pill — vacuumed from viewport chaos toward its phone column
 * during the gather phase, then hands off to ColumnDropPill.
 */
export function VacuumScatterPill({
  task,
  smoothProgress,
  floatActive,
}: {
  task: HeroTimelineTask;
  smoothProgress: MotionValue<number>;
  floatActive: boolean;
}) {
  const tone = HERO_PILL_TONES[task.tone];
  const window = pillWindow(task);
  const { gatherEnd } = HERO_VACUUM_PHASES;
  const targetY =
    slotCenterRelativeToPhoneCenter(task.order) + gatherDropOffset(task.dropFromY, task.order);

  const x = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd: gEnd } = window;
    if (progress <= start) return task.scatterStartX;
    if (progress <= gEnd) {
      const t = easeOutQuint((progress - start) / (gEnd - start));
      return lerp(task.scatterStartX, task.gatherJitterX, t);
    }
    return task.gatherJitterX;
  });

  const y = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd: gEnd } = window;
    if (progress <= start) return task.scatterStartY;
    if (progress <= gEnd) {
      const t = easeOutQuint((progress - start) / (gEnd - start));
      return lerp(task.scatterStartY, targetY, t);
    }
    return targetY;
  });

  const rotate = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd: gEnd } = window;
    if (progress <= start) return task.rotate;
    if (progress <= gEnd) {
      const t = easeOutQuint((progress - start) / (gEnd - start));
      return lerp(task.rotate, 0, t);
    }
    return 0;
  });

  const opacity = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd: gEnd } = window;
    if (progress <= start) return 0.4;
    if (progress <= gEnd - 0.06) {
      const t = easeOutQuint((progress - start) / (gEnd - 0.06 - start));
      return lerp(0.4, 1, t);
    }
    if (progress <= gEnd) {
      return lerp(1, 0, easeOutQuint((progress - (gEnd - 0.06)) / 0.06));
    }
    return 0;
  });

  const scale = useTransform(smoothProgress, (progress) => {
    const { start, gatherEnd: gEnd } = window;
    if (progress <= start) return 0.86;
    if (progress <= gEnd) {
      const t = easeOutQuint((progress - start) / (gEnd - start));
      return lerp(0.86, 0.96, t);
    }
    return 0.96;
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
        zIndex: 30 + task.order,
        x,
        y,
        rotate,
        opacity,
        scale,
      }}
    >
      <motion.div
        animate={floatActive ? { translateY: [0, -5, 0] } : undefined}
        transition={
          floatActive
            ? {
                delay: task.delay,
                duration: 2.6,
                ease: 'easeInOut',
                times: [0, 0.5, 1],
                repeat: Infinity,
              }
            : undefined
        }
        className={cn(PILL_SHELL_CLASS, 'border')}
        style={{
          backgroundColor: tone.bg,
          borderColor: tone.border,
          width: PILL_SLOT_WIDTH,
          height: slotHeightPx(),
        }}
      >
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
