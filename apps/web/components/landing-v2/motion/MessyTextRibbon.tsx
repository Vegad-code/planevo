'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { MESSY_RIBBON_TEXT } from '@/components/landing-v2/demo/fixtures';

/**
 * Wispr-style messy ribbon: rambling mono text flowing along an arc into the
 * hero card from the left. Purely decorative — hidden below lg and for
 * reduced motion.
 */
export function MessyTextRibbon() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <motion.svg
      viewBox="0 0 900 400"
      aria-hidden
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="pointer-events-none absolute -left-[420px] top-1/3 hidden h-[400px] w-[900px] lg:block"
    >
      <defs>
        <path id="messy-arc" d="M 0 320 Q 300 80 900 200" fill="none" />
      </defs>
      {/* Faint guide stroke drawing in beneath the text */}
      <motion.path
        d="M 0 320 Q 300 80 900 200"
        fill="none"
        stroke="var(--color-ink-faint)"
        strokeOpacity={0.18}
        strokeWidth={1}
        strokeDasharray="3 6"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />
      <text className="fill-[var(--color-ink-faint)] font-mono text-[11px]">
        <motion.textPath
          href="#messy-arc"
          initial={{ startOffset: '0%' }}
          whileInView={{ startOffset: '2%' }}
          viewport={{ once: true }}
          transition={{ duration: 2.4, ease: 'easeOut' }}
        >
          {MESSY_RIBBON_TEXT}
        </motion.textPath>
      </text>
    </motion.svg>
  );
}
