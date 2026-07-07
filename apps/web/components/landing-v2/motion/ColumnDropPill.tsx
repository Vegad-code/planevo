'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';
import { HERO_PILL_TONES, type HeroTimelineTask } from '@/components/landing-v2/demo/fixtures';
import { cn } from '@/lib/utils';
import {
  gatherDropOffset,
  PILL_SLOT_WIDTH,
  slotHeightPx,
  slotTopY,
  SLOT_AREA_LEFT,
} from './heroTimelineLayout';
import { pillLandWindow, springDropY, springScale } from './heroSpringEasing';
import {
  easeOutQuint,
  HERO_VACUUM_PHASES,
  lerp,
  pillWindow,
  slotFadeT,
} from './useHeroVacuumProgress';

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

export function ColumnDropPill({
  task,
  smoothProgress,
  trackCount,
}: {
  task: HeroTimelineTask;
  smoothProgress: MotionValue<number>;
  trackCount: number;
}) {
  const tone = HERO_PILL_TONES[task.tone];
  const window = pillWindow(task);
  const top = slotTopY(task.order);
  const slotHeight = slotHeightPx();
  const gatherOffset = gatherDropOffset(task.dropFromY, task.order);
  const { gatherEnd, organizeEnd, payoffEnd, depositStart } = HERO_VACUUM_PHASES;
  const { landStart, landEnd } = pillLandWindow(task.order, trackCount, gatherEnd, organizeEnd);

  const opacity = useTransform(smoothProgress, (progress) => {
    if (progress <= gatherEnd - 0.04) return 0;
    if (progress <= gatherEnd) {
      return lerp(0, 1, easeOutQuint((progress - (gatherEnd - 0.04)) / 0.04));
    }
    if (progress >= depositStart) return 0;
    return 1;
  });

  const y = useTransform(smoothProgress, (progress) => {
    if (progress <= gatherEnd) return gatherOffset;
    if (progress <= organizeEnd) {
      return springDropY(progress, landStart, landEnd, gatherOffset, 0);
    }
    return 0;
  });

  const rotate = useTransform(smoothProgress, (progress) => {
    const { organizeEnd: orgEnd } = window;
    if (progress <= gatherEnd) return 0;
    if (progress <= orgEnd) {
      const t = easeOutQuint((progress - gatherEnd) / (orgEnd - gatherEnd));
      return lerp(task.rotate * 0.3, 0, t);
    }
    return 0;
  });

  const scale = useTransform(smoothProgress, (progress) => {
    if (progress <= gatherEnd) return 0.96;
    if (progress <= landEnd) {
      return springScale(progress, landStart, landEnd);
    }
    if (progress <= payoffEnd) {
      const mid = (organizeEnd + payoffEnd) / 2;
      if (progress <= mid) {
        const t = easeOutQuint((progress - organizeEnd) / (mid - organizeEnd));
        return lerp(1, 1.02, t);
      }
      const t = easeOutQuint((progress - mid) / (payoffEnd - mid));
      return lerp(1.02, 1, t);
    }
    return 1;
  });

  return (
    <motion.div
      className="pointer-events-none absolute will-change-transform"
      style={{
        top,
        left: SLOT_AREA_LEFT + 2,
        width: PILL_SLOT_WIDTH,
        height: slotHeight,
        zIndex: 20 + task.order,
        y,
        rotate,
        opacity,
        scale,
      }}
    >
      <div
        className={cn(PILL_SHELL_CLASS, 'h-full w-full border')}
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
    </motion.div>
  );
}

export function ColumnStaticPill({ task }: { task: HeroTimelineTask }) {
  const tone = HERO_PILL_TONES[task.tone];
  const top = slotTopY(task.order);
  const slotHeight = slotHeightPx();

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        top,
        left: SLOT_AREA_LEFT + 2,
        width: PILL_SLOT_WIDTH,
        height: slotHeight,
        zIndex: 10 + task.order,
      }}
    >
      <div
        className={cn(PILL_SHELL_CLASS, 'h-full w-full border')}
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
    </div>
  );
}

function SlotGhost({
  order,
  smoothProgress,
}: {
  order: number;
  smoothProgress: MotionValue<number>;
}) {
  const top = slotTopY(order);
  const height = slotHeightPx();
  const { gatherEnd, depositStart } = HERO_VACUUM_PHASES;

  const opacity = useTransform(smoothProgress, (progress) => {
    if (progress <= gatherEnd) return 0;
    if (progress >= depositStart) return 0;
    const fade = slotFadeT(progress);
    if (fade <= 0) return 0.35;
    return lerp(0.35, 0, fade);
  });

  return (
    <motion.div
      className="pointer-events-none absolute rounded-xl border border-dashed border-[var(--color-honey-deep)]/35 bg-[var(--color-honey-soft)]/30"
      style={{
        top,
        left: SLOT_AREA_LEFT,
        width: PILL_SLOT_WIDTH + 4,
        height,
        opacity,
      }}
    />
  );
}

export { SlotGhost };
