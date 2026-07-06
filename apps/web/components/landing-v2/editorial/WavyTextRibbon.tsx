'use client';

import { motion, useReducedMotion } from 'framer-motion';

const RIBBON_TEXT =
  'messy brain dump → calm board → real calendar gaps → a plan that adapts';

interface WavyTextRibbonProps {
  className?: string;
}

export function WavyTextRibbon({ className }: WavyTextRibbonProps) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <motion.svg
      viewBox="0 0 1200 120"
      aria-hidden
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: 'easeOut' }}
      className={className}
    >
      <defs>
        <path id="wavy-ribbon-path" d="M 0 70 Q 300 20 600 65 T 1200 55" fill="none" />
      </defs>
      <path
        d="M -20 95 Q 280 35 600 80 T 1220 70 L 1220 110 Q 880 50 600 95 T -20 55 Z"
        fill="var(--color-charcoal)"
      />
      <text
        className="fill-[var(--color-paper)] text-[13px] font-medium uppercase tracking-[0.14em]"
        style={{ fontFamily: 'var(--font-marketing-sans), sans-serif' }}
      >
        <textPath href="#wavy-ribbon-path" startOffset="2%">
          {RIBBON_TEXT}
        </textPath>
      </text>
    </motion.svg>
  );
}
