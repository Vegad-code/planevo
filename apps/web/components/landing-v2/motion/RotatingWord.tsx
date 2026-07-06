'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const WORDS = ['adapts', 'bends', 'listens', 'keeps up', 'survives Mondays'];

/**
 * Hero headline verb that cycles through adjectives with a spring y-slide —
 * "A plan that ___." Falls back to a single static word for reduced motion.
 */
export function RotatingWord() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % WORDS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reduce]);

  if (reduce) {
    return <span className="italic text-[var(--color-honey-deep)]">adapts</span>;
  }

  return (
    <span className="relative inline-flex justify-center overflow-hidden pb-[0.12em] align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={WORDS[index]}
          initial={{ y: '70%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-70%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 90, damping: 16 }}
          className="whitespace-nowrap italic text-[var(--color-honey-deep)]"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
