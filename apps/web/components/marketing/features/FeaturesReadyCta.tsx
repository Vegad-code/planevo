import Link from 'next/link';
import { Eyebrow } from '@/components/landing-v2/Eyebrow';
import { OceanPillButton } from '@/components/landing-v2/editorial/OceanPillButton';
import { ScrollReveal } from '@/components/landing-v2/motion/ScrollReveal';

export function FeaturesReadyCta() {
  return (
    <section className="px-6 py-16 sm:py-24">
      <ScrollReveal className="mx-auto max-w-2xl text-center">
        <Eyebrow>Ready to plan</Eyebrow>
        <h2 className="font-serif text-3xl leading-tight tracking-tight text-[var(--color-ink)] md:text-5xl">
          Your week, rebuilt around real time.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)] md:text-base">
          Dump the chaos. Planevo pulls your calendar, tasks, and notes into one calm
          board — free to start, no card required.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <OceanPillButton href="/signup">Start free</OceanPillButton>
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full border border-[var(--color-line-strong)] px-6 py-3 text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)]"
          >
            See pricing
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
