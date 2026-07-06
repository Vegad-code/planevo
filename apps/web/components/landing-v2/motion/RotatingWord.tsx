'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const WORDS = ['handled', 'sorted', 'planned', 'calm'] as const;
const LONGEST = 'handled';
const INTERVAL_MS = 3200;

export function RotatingWord() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % WORDS.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  if (reduce) {
    return <span className="italic text-[var(--color-honey-deep)]">handled.</span>;
  }

  return (
    <>
      <span className="sr-only">handled.</span>
      <span
        aria-hidden
        className="relative inline-grid justify-items-center overflow-hidden pb-[0.12em] align-bottom"
      >
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap italic">
          {LONGEST}.
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={WORDS[index]}
            initial={{ y: '70%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-70%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 16 }}
            className="col-start-1 row-start-1 whitespace-nowrap italic text-[var(--color-honey-deep)]"
          >
            {WORDS[index]}.
          </motion.span>
        </AnimatePresence>
      </span>
    </>
  );
}
