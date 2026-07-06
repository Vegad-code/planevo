import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Eyebrow } from '../Eyebrow';
import { FeatureStage } from './FeatureStage';
import type { StageBackdropVariant } from '../StageBackdrop';
import { ScrollReveal } from '../motion/ScrollReveal';

/**
 * Zig-zag feature pattern: copy and product stage side by side, alternating each row.
 */
export function FeatureShowcase({
  id,
  eyebrow,
  headline,
  body,
  backdrop,
  learnMoreHref,
  reverse = false,
  children,
}: {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  backdrop: StageBackdropVariant;
  learnMoreHref?: string;
  /** When true, stage sits left and copy sits right on large screens. */
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 px-6 py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <ScrollReveal
          className={cn(
            'flex min-h-0 flex-col items-start text-left lg:min-h-[420px] lg:justify-center',
            reverse ? 'lg:order-2' : 'lg:order-1',
          )}
        >
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="font-serif text-[36px] leading-[1.08] tracking-tight text-[var(--color-ink)] sm:text-[44px]">
            {headline}
          </h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-[var(--color-ink-soft)]">
            {body}
          </p>
          {learnMoreHref && (
            <Link
              href={learnMoreHref}
              className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--color-ink)] underline decoration-[var(--color-line-strong)] decoration-2 underline-offset-4 transition-colors hover:text-[var(--color-ink-soft)]"
            >
              See how it works <span aria-hidden>→</span>
            </Link>
          )}
        </ScrollReveal>

        <div className={cn('min-w-0', reverse ? 'lg:order-1' : 'lg:order-2')}>
          <FeatureStage backdrop={backdrop} className="max-w-none">
            {children}
          </FeatureStage>
        </div>
      </div>
    </section>
  );
}
