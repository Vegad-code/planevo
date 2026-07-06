'use client';

import {
  motion,
  motionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { HERO_VACUUM_PHASES } from '@/components/landing-v2/motion/useHeroVacuumProgress';

interface HandwrittenUnderlineProps {
  className?: string;
  width?: number;
  /** When provided, path draws in sync with hero scroll instead of whileInView. */
  drawProgress?: MotionValue<number>;
}

const ZERO_PROGRESS = motionValue(0);

export function HandwrittenUnderline({
  className,
  width = 280,
  drawProgress,
}: HandwrittenUnderlineProps) {
  const reduce = useReducedMotion();
  const { organizeEnd, payoffEnd } = HERO_VACUUM_PHASES;
  const progress = drawProgress ?? ZERO_PROGRESS;

  const scrollPathLength = useTransform(progress, (p) => {
    if (p <= organizeEnd) return 0;
    if (p >= payoffEnd) return 1;
    return (p - organizeEnd) / (payoffEnd - organizeEnd);
  });

  const scrollOpacity = useTransform(progress, (p) => (p >= organizeEnd ? 1 : 0));

  if (drawProgress && !reduce) {
    return (
      <svg
        aria-hidden
        viewBox={`0 0 ${width} 24`}
        width={width}
        height={24}
        className={className}
        fill="none"
      >
        <motion.path
          d={`M 4 18 Q ${width * 0.25} 4 ${width * 0.5} 14 T ${width - 8} 10`}
          stroke="var(--color-ocean)"
          strokeWidth={3}
          strokeLinecap="round"
          style={{ pathLength: scrollPathLength, opacity: scrollOpacity }}
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} 24`}
      width={width}
      height={24}
      className={className}
      fill="none"
    >
      <motion.path
        d={`M 4 18 Q ${width * 0.25} 4 ${width * 0.5} 14 T ${width - 8} 10`}
        stroke="var(--color-ocean)"
        strokeWidth={3}
        strokeLinecap="round"
        initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
    </svg>
  );
}
