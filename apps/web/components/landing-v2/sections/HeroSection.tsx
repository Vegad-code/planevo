import Link from 'next/link';
import { CommandHeroDemo } from '../demo/CommandHeroDemo';
import { RotatingWord } from '../motion/RotatingWord';
import { HeroAccentGlow } from '../DotGridSurface';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-20 pt-36 sm:pb-28 sm:pt-44">
      <HeroAccentGlow />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-4 py-1.5 text-[13px] text-[var(--color-ink-soft)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-forest)]" aria-hidden />
            Free to start
          </p>
          <h1 className="font-serif text-[48px] font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-[68px] lg:text-[84px]">
            Your week,
            <br />
            <RotatingWord />
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--color-ink-soft)] sm:text-[19px]">
            For students whose calendars change faster than they can replan.
            Planevo builds your day around your real availability — and adapts
            when life happens.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-full bg-[var(--color-ink)] px-8 py-3.5 text-center font-sans text-[16px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99] sm:w-auto"
            >
              Start free <span aria-hidden>→</span>
            </Link>
            <Link
              href="#capture"
              className="w-full rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-8 py-3.5 text-center font-sans text-[16px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)] sm:w-auto"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-[var(--color-ink-soft)]">No card required</p>
        </div>

        <div className="relative mx-auto mt-16 max-w-4xl rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface-raised)]/90 p-4 shadow-lg backdrop-blur-sm sm:mt-20 sm:p-6">
          <CommandHeroDemo />
        </div>
      </div>
    </section>
  );
}
