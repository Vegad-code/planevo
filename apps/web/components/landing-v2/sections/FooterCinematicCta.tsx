'use client';

import Image from 'next/image';
import { useReducedMotion } from 'framer-motion';
import { GlassPillButton } from '../editorial/GlassPillButton';
import { TaskFlowPath } from '../motion/TaskFlowPath';
import { MARKETING_BLUR_IMAGES } from '@/lib/marketing/assets';

export function FooterCinematicCta() {
  const reduce = useReducedMotion();

  return (
    <section className="relative px-3 pb-4 pt-6 sm:px-4 sm:pb-5 lg:px-5">
      <div className="relative min-h-[min(72vh,720px)] w-full overflow-hidden rounded-[28px] sm:min-h-[min(78vh,820px)] sm:rounded-[36px] lg:rounded-[44px]">
        <Image
          src={MARKETING_BLUR_IMAGES.footer}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority={false}
        />
        {/* Wispr-style scrim for readable cream text */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,20,20,0.15)_0%,rgba(20,20,20,0.45)_55%,rgba(20,20,20,0.55)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,235,0.12)_0%,transparent_60%)]"
        />

        <div className="relative z-10 flex min-h-[min(72vh,720px)] flex-col items-center justify-center px-6 py-20 text-center sm:min-h-[min(78vh,820px)] sm:px-10 sm:py-24">
          {!reduce && <TaskFlowPath />}

          <h2 className="relative z-10 font-serif text-[48px] leading-[1.06] tracking-tight text-[var(--color-paper)] sm:text-[72px]">
            Start planning...
          </h2>
          <p className="relative z-10 mt-4 max-w-md text-[16px] leading-relaxed text-[var(--color-paper)]/85 sm:text-[18px]">
            Dump the chaos. Planevo pulls your week together — free to start, no
            card required.
          </p>

          <div className="relative z-10 mt-9">
            <GlassPillButton href="/signup" className="w-full sm:w-auto">
              Get started now
            </GlassPillButton>
          </div>
        </div>
      </div>
    </section>
  );
}
