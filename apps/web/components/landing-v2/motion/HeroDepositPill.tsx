'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useState } from 'react';
import { HERO_PILL_TONES, type HeroTimelineTask } from '@/components/landing-v2/demo/fixtures';
import { cn } from '@/lib/utils';
import { useHeroHandoff } from './HeroHandoffContext';
import {
  DEPOSIT_FALLBACK_Y,
  PILL_SLOT_WIDTH,
  slotCenterRelativeToPhoneCenter,
  slotCenterXRelativeToTrack,
  slotHeightPx,
  TRACK_LEFT,
  TRACK_RIGHT,
} from './heroTimelineLayout';
import {
  depositStaggerIndex,
  depositT,
  easeInQuad,
  HERO_VACUUM_PHASES,
  lerp,
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

export function HeroDepositPill({
  task,
  smoothProgress,
}: {
  task: HeroTimelineTask;
  smoothProgress: MotionValue<number>;
}) {
  const tone = HERO_PILL_TONES[task.tone];
  const { intakePoint, fallbackIntake } = useHeroHandoff();
  const stagger = depositStaggerIndex(task);
  const startY = slotCenterRelativeToPhoneCenter(task.order);
  const startX =
    task.track === 'left' ? slotCenterXRelativeToTrack() : -slotCenterXRelativeToTrack();

  const [intake, setIntake] = useState(() => intakePoint ?? fallbackIntake);
  useEffect(() => {
    setIntake(intakePoint ?? fallbackIntake);
  }, [intakePoint, fallbackIntake]);

  const opacity = useTransform(smoothProgress, (progress) => {
    const { depositStart } = HERO_VACUUM_PHASES;
    if (progress < depositStart) return 0;
    const t = depositT(progress, stagger);
    if (t <= 0) return 1;
    if (t >= 0.85) return lerp(1, 0, easeInQuad((t - 0.85) / 0.15));
    return 1;
  });

  const x = useTransform(smoothProgress, (progress) => {
    const { depositStart } = HERO_VACUUM_PHASES;
    if (progress < depositStart) return 0;
    const t = depositT(progress, stagger);
    const startXVal = startX;
    const endX = intake.x;
    return lerp(startXVal, endX, easeInQuad(t));
  });

  const y = useTransform(smoothProgress, (progress) => {
    const { depositStart } = HERO_VACUUM_PHASES;
    if (progress < depositStart) return startY;
    const t = depositT(progress, stagger);
    const endY = intake.y || DEPOSIT_FALLBACK_Y;
    return lerp(startY, endY, easeInQuad(t));
  });

  const scale = useTransform(smoothProgress, (progress) => {
    const { depositStart } = HERO_VACUUM_PHASES;
    if (progress < depositStart) return 1;
    const t = depositT(progress, stagger);
    return lerp(1, 0.88, easeInQuad(t));
  });

  const rotate = useTransform(smoothProgress, (progress) => {
    const { depositStart } = HERO_VACUUM_PHASES;
    if (progress < depositStart) return 0;
    const t = depositT(progress, stagger);
    return lerp(0, task.rotate * 0.2, easeInQuad(t));
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
        zIndex: 40 + stagger,
        x,
        y,
        rotate,
        opacity,
        scale,
      }}
    >
      <div
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
      </div>
    </motion.div>
  );
}
