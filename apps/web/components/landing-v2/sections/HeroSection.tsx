'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { FloatingUiCard } from '../editorial/FloatingUiCard';
import { CommandHeroDemo } from '../demo/CommandHeroDemo';
import { ElasticTimeStream } from '../motion/ElasticTimeStream';
import { ChaosToCalmCard } from '../motion/ChaosToCalmCard';
import { useHeroVacuumProgress } from '../motion/useHeroVacuumProgress';
import { HeroCopy, HeroCtas, HeroIntro } from './HeroTimeStreamScene';
import { HeroDemoSection } from './HeroDemoSection';

export function HeroSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  const { smoothProgress } = useHeroVacuumProgress(scrollYProgress);
  const headlineOpacity = useTransform(smoothProgress, [0.88, 0.95], [1, 0]);
  const headlineY = useTransform(smoothProgress, [0.88, 0.95], [0, -20]);

  if (reduce) {
    return (
      <>
        <section
          ref={trackRef}
          className="relative bg-[var(--color-paper)] pb-12 pt-32 sm:pb-16 sm:pt-40"
        >
          <div className="px-6">
            <div className="mx-auto w-full max-w-xl text-center">
              <HeroCopy />
            </div>
            <ElasticTimeStream smoothProgress={smoothProgress} className="mt-10" />
          </div>
        </section>

        <section className="bg-[var(--color-paper)] px-6 pb-20 pt-8 sm:pb-28">
          <div className="relative mx-auto max-w-4xl">
            <FloatingUiCard variant="cream" parallax className="p-4 sm:p-6">
              <CommandHeroDemo />
            </FloatingUiCard>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section ref={trackRef} className="relative bg-[var(--color-paper)]">
        <div className="h-[140vh] sm:h-[155vh] lg:h-[200vh]">
          <div className="sticky top-0 grid h-svh min-h-svh grid-cols-1 grid-rows-1 lg:grid-cols-[1fr_minmax(0,36rem)_1fr]">
            <ElasticTimeStream
              smoothProgress={smoothProgress}
              variant="desktop"
              className="absolute inset-0 hidden lg:block"
            />

            {/* Desktop hero copy — top-anchored so morph + CTAs are never clipped */}
            <div className="relative z-20 col-start-1 row-start-1 hidden px-6 pt-[14vh] sm:pt-[16vh] lg:col-start-2 lg:block lg:pt-[18vh]">
              <div className="mx-auto flex w-full max-w-xl flex-col text-center">
                <motion.div style={{ opacity: headlineOpacity, y: headlineY }}>
                  <HeroIntro drawProgress={smoothProgress} />
                </motion.div>
                <ChaosToCalmCard />
                <motion.div style={{ opacity: headlineOpacity, y: headlineY }}>
                  <HeroCtas />
                </motion.div>
              </div>
            </div>

            {/* Mobile hero copy */}
            <div className="relative z-20 col-start-1 row-start-1 px-6 pt-28 pb-8 lg:hidden">
              <div className="mx-auto w-full max-w-xl text-center">
                <HeroCopy drawProgress={smoothProgress} />
              </div>
            </div>

            <div className="relative z-10 col-start-1 row-start-1 flex items-end px-6 pb-8 lg:hidden">
              <ElasticTimeStream
                smoothProgress={smoothProgress}
                variant="mobile"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <HeroDemoSection />
    </>
  );
}
