'use client';

import { useEffect, useState } from 'react';
import {
  AnimatePresence,
  motion,
  motionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { HERO_VACUUM_PHASES } from './useHeroVacuumProgress';

const WORDS = ['handled', 'sorted', 'planned', 'calm'] as const;
const SORTED_INDEX = WORDS.indexOf('sorted');
const LONGEST = 'handled';
const INTERVAL_MS = 3200;

const ZERO_PROGRESS = motionValue(0);

interface RotatingWordProps {
  /** When progress crosses organizeEnd, lock on "sorted."; resume shuffling when scrolling back. */
  lockProgress?: MotionValue<number>;
}

export function RotatingWord({ lockProgress }: RotatingWordProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const progress = lockProgress ?? ZERO_PROGRESS;

  useMotionValueEvent(progress, 'change', (value) => {
    if (value >= HERO_VACUUM_PHASES.organizeEnd) {
      setLocked(true);
      setIndex(SORTED_INDEX);
      return;
    }
    setLocked(false);
  });

  useEffect(() => {
    if (reduce || locked) return;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % WORDS.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduce, locked]);

  const wordScale = useTransform(progress, (p) => {
    if (p < HERO_VACUUM_PHASES.organizeEnd) return 1;
    if (p >= HERO_VACUUM_PHASES.payoffEnd) return 1;
    const mid = (HERO_VACUUM_PHASES.organizeEnd + HERO_VACUUM_PHASES.payoffEnd) / 2;
    if (p <= mid) {
      const t = (p - HERO_VACUUM_PHASES.organizeEnd) / (mid - HERO_VACUUM_PHASES.organizeEnd);
      return 1 + t * 0.06;
    }
    const t = (p - mid) / (HERO_VACUUM_PHASES.payoffEnd - mid);
    return 1.06 - t * 0.06;
  });

  if (reduce) {
    return <span className="italic text-[var(--color-ocean-deep)]">sorted.</span>;
  }

  const displayWord = locked ? 'sorted' : WORDS[index];

  return (
    <>
      <span className="sr-only">sorted.</span>
      <motion.span
        aria-hidden
        style={locked ? { scale: wordScale } : undefined}
        className="relative inline-grid origin-center justify-items-center overflow-hidden pb-[0.12em] align-bottom"
      >
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap italic">
          {LONGEST}.
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={displayWord}
            initial={{ y: locked ? '40%' : '70%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-70%', opacity: 0 }}
            transition={
              locked
                ? { type: 'spring', stiffness: 120, damping: 18 }
                : { type: 'spring', stiffness: 90, damping: 16 }
            }
            className="col-start-1 row-start-1 whitespace-nowrap italic text-[var(--color-ocean-deep)]"
          >
            {displayWord}.
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
}
