'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CLEAN_RIBBON_ROWS } from '@/components/landing-v2/demo/fixtures';

/**
 * The mirror of MessyTextRibbon: clean, structured rows drifting out of the
 * hero card's right edge — messy in, order out. Decorative; lg-only.
 */
export function CleanOutputRibbon() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-32 top-1/4 hidden w-56 flex-col gap-3 xl:flex"
    >
      {CLEAN_RIBBON_ROWS.map((row, i) => (
        <motion.div
          key={row}
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ delay: 0.6 + i * 0.18, duration: 0.5, ease: 'easeOut' }}
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-paper)]/90 px-4 py-2 font-sans text-[13px] text-[var(--color-ink)] shadow-sm"
        >
          {row}
        </motion.div>
      ))}
    </div>
  );
}
