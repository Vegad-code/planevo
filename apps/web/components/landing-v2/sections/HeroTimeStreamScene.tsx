'use client';

import Link from 'next/link';
import type { MotionValue } from 'framer-motion';
import { RotatingWord } from '../motion/RotatingWord';
import { OceanPillButton } from '../editorial/OceanPillButton';
import { HandwrittenUnderline } from '../editorial/HandwrittenUnderline';
import { ChaosToCalmCard } from '../motion/ChaosToCalmCard';

export function HeroIntro({ drawProgress }: { drawProgress?: MotionValue<number> }) {
  return (
    <>
      <h1 className="font-serif text-[length:var(--text-display)] font-normal leading-[1.06] tracking-tight text-[var(--color-ink)]">
        Your week,
        <br />
        <span className="relative inline-block">
          <RotatingWord />
          <HandwrittenUnderline
            className="absolute -bottom-1 left-1/2 -translate-x-1/2"
            width={200}
            drawProgress={drawProgress}
          />
        </span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--color-ink-soft)] sm:text-[19px]">
        For students and anyone whose week never quite stays put. Planevo pulls
        the chaos together — building your day around real availability and
        adapting when life happens.
      </p>
    </>
  );
}

export function HeroCtas() {
  return (
    <>
      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <OceanPillButton href="/signup" className="w-full justify-center sm:w-auto">
          Start free
        </OceanPillButton>
        <Link
          href="#capture"
          className="w-full rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-8 py-3.5 text-center text-[16px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)] sm:w-auto"
        >
          See how it works
        </Link>
      </div>
      <p className="mt-4 text-[13px] text-[var(--color-ink-soft)]">No card required</p>
    </>
  );
}

/** Headline + Wispr morph + CTAs — mobile and reduced-motion layouts. */
export function HeroCopy({ drawProgress }: { drawProgress?: MotionValue<number> }) {
  return (
    <>
      <HeroIntro drawProgress={drawProgress} />
      <ChaosToCalmCard />
      <HeroCtas />
    </>
  );
}
