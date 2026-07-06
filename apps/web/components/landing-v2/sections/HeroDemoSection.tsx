'use client';

import { useRef } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { CommandHeroDemo } from '../demo/CommandHeroDemo';
import { FloatingUiCard } from '../editorial/FloatingUiCard';

/**
 * Product demo below the hero scroll scene — in normal document flow so it
 * never covers the Wispr morph card. Auto-starts when scrolled into view;
 * pauses when scrolled away so the hero remains revisitable.
 */
export function HeroDemoSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.35, margin: '0px 0px -10% 0px' });

  return (
    <section
      ref={ref}
      id="capture"
      className="relative z-10 bg-[var(--color-paper)] px-6 pb-20 pt-10 sm:pb-28 sm:pt-12"
    >
      <div className="relative mx-auto max-w-4xl">
        <FloatingUiCard variant="cream" parallax={!reduce} className="p-4 sm:p-6">
          <CommandHeroDemo startWhen={inView} />
        </FloatingUiCard>
      </div>
    </section>
  );
}
