import Link from 'next/link';
import { ScrollReveal } from '../motion/ScrollReveal';

export function FinalCta() {
  return (
    <section className="px-6 pb-24 pt-24 sm:pb-32 sm:pt-32">
      <ScrollReveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 className="font-serif text-[44px] leading-[1.08] tracking-tight text-[var(--color-ink)] sm:text-[72px] lg:text-[96px]">
          Ready when your day changes.
        </h2>
        <Link
          href="/signup"
          className="mt-10 rounded-full bg-[var(--color-ink)] px-10 py-4 font-sans text-[17px] font-semibold text-white shadow-xl transition-transform hover:scale-[1.02]"
        >
          Start free <span aria-hidden>→</span>
        </Link>
        <p className="mt-6 text-[14px] text-[var(--color-ink-soft)]">
          No card required · Cancel anytime
        </p>
      </ScrollReveal>
    </section>
  );
}
