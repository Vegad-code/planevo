'use client';

import { motion, useReducedMotion } from 'framer-motion';

const CIRCLE_TEXT =
  'dump it all · capture the chaos · let Bruno sort it · plan around real gaps · adapt when life shifts · ';

interface CircularPathTextProps {
  className?: string;
}

export function CircularPathText({ className }: CircularPathTextProps) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <motion.svg
      viewBox="0 0 400 400"
      aria-hidden
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className={className}
    >
      <defs>
        <path
          id="hero-circle-path"
          d="M 200 200 m -160 0 a 160 160 0 1 1 320 0 a 160 160 0 1 1 -320 0"
          fill="none"
        />
      </defs>
      <text
        className="fill-[var(--color-ink-faint)] text-[11px] uppercase tracking-[0.22em]"
        style={{ fontFamily: 'var(--font-marketing-sans), sans-serif' }}
      >
        <textPath href="#hero-circle-path" startOffset="0%">
          {CIRCLE_TEXT.repeat(2)}
        </textPath>
      </text>
    </motion.svg>
  );
}
