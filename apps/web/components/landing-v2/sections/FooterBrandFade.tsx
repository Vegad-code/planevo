'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { PlanevoLogo } from '@/components/PlanevoLogo';

/**
 * Large footer wordmark — fades in on view (opacity only) and dissolves
 * into the cream page via a bottom mask, Apple-style. No downward motion.
 */
export function FooterBrandFade() {
  const reduce = useReducedMotion();

  const content = (
    <div
      className="flex w-full items-center justify-center gap-5 sm:gap-8"
      style={{
        maskImage:
          'linear-gradient(to bottom, black 0%, black 52%, rgba(0,0,0,0.55) 72%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, black 0%, black 52%, rgba(0,0,0,0.55) 72%, transparent 100%)',
      }}
    >
      <PlanevoLogo
        size={80}
        className="shrink-0 text-[var(--color-ink)] sm:!h-[96px] sm:!w-[115px]"
      />
      <span
        aria-hidden
        className="inline-block origin-center scale-y-[1.28] font-serif text-[clamp(5rem,24vw,15rem)] font-semibold leading-none tracking-tight text-[var(--color-ink)]"
      >
        Planevo
      </span>
    </div>
  );

  if (reduce) {
    return (
      <div className="px-4 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:px-12 xl:px-16">
        {content}
      </div>
    );
  }

  return (
    <motion.div
      className="px-4 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:px-12 xl:px-16"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    >
      {content}
    </motion.div>
  );
}
