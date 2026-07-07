'use client';

import { useRef, useState } from 'react';
import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { CommandHeroDemo } from '../demo/CommandHeroDemo';
import { FloatingUiCard } from '../editorial/FloatingUiCard';
import { useHeroHandoff } from '../motion/HeroHandoffContext';
import { HERO_VACUUM_PHASES } from '../motion/useHeroVacuumProgress';

function ScrollLinkedDemoCard({
  scrollProgress,
  children,
}: {
  scrollProgress: MotionValue<number>;
  children: React.ReactNode;
}) {
  const { demoEnterStart, demoTrigger } = HERO_VACUUM_PHASES;
  const opacity = useTransform(scrollProgress, [demoEnterStart, demoTrigger], [0, 1]);
  const y = useTransform(scrollProgress, [demoEnterStart, demoTrigger], [56, 0]);
  const scale = useTransform(scrollProgress, [demoEnterStart, demoTrigger], [0.94, 1]);
  const intakePulse = useTransform(scrollProgress, [0.955, 0.965, 0.975], [1, 1.015, 1]);
  const intakeGlow = useTransform(scrollProgress, [0.955, 0.965, 0.975], [0, 1, 0]);
  const boxShadow = useTransform(intakeGlow, (g) =>
    g > 0
      ? `0 0 ${12 * g}px color-mix(in srgb, var(--color-ocean) 28%, transparent)`
      : 'none',
  );

  return (
    <motion.div style={{ opacity, y, scale }} className="relative">
      <motion.div style={{ scale: intakePulse, boxShadow }} className="rounded-[inherit]">
        {children}
      </motion.div>
    </motion.div>
  );
}

function ScrollDemoReady({
  scrollProgress,
  onReady,
}: {
  scrollProgress: MotionValue<number>;
  onReady: () => void;
}) {
  const { demoTrigger } = HERO_VACUUM_PHASES;
  useMotionValueEvent(scrollProgress, 'change', (v) => {
    if (v > demoTrigger) onReady();
  });
  return null;
}

/**
 * Product demo below the hero scroll scene — scroll-linked enter after the
 * timeline deposit handoff; auto-starts when deposit lands.
 */
export function HeroDemoSection({
  scrollProgress,
}: {
  scrollProgress?: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { demoIntakeRef } = useHeroHandoff();
  const inView = useInView(ref, { amount: 0.35, margin: '0px 0px -10% 0px' });
  const [scrollReady, setScrollReady] = useState(false);

  const startDemo = inView || scrollReady;

  const card = (
    <div ref={demoIntakeRef} className="relative">
      <FloatingUiCard variant="cream" parallax={!reduce} className="p-4 sm:p-6">
        <CommandHeroDemo startWhen={startDemo} />
      </FloatingUiCard>
    </div>
  );

  return (
    <section
      ref={ref}
      id="capture"
      className="relative z-10 -mt-[16vh] bg-[var(--color-paper)] px-6 pb-20 pt-6 sm:-mt-[20vh] sm:pb-28 sm:pt-8 lg:-mt-[26vh]"
    >
      {scrollProgress && !reduce ? (
        <ScrollDemoReady scrollProgress={scrollProgress} onReady={() => setScrollReady(true)} />
      ) : null}
      <p className="mx-auto mb-4 max-w-4xl text-center font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-soft)]">
        Capture → board → Bruno proposes changes you approve
      </p>
      <div className="relative mx-auto max-w-4xl">
        {scrollProgress && !reduce ? (
          <ScrollLinkedDemoCard scrollProgress={scrollProgress}>{card}</ScrollLinkedDemoCard>
        ) : (
          card
        )}
      </div>
    </section>
  );
}
