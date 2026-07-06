import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Eyebrow } from '../Eyebrow';
import { FloatingUiCard } from '../editorial/FloatingUiCard';
import { HandwrittenUnderline } from '../editorial/HandwrittenUnderline';
import { EditorialSection } from '../editorial/EditorialSection';
import { ScrollReveal } from '../motion/ScrollReveal';

export function FeatureShowcase({
  id,
  eyebrow,
  headline,
  body,
  learnMoreHref,
  reverse = false,
  highlightHeadline = false,
  children,
}: {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  learnMoreHref?: string;
  reverse?: boolean;
  highlightHeadline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <EditorialSection
      id={id}
      tone="charcoal"
      roundedTop
      className="scroll-mt-24 px-6 py-16 sm:py-24"
    >
      <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <ScrollReveal
          className={cn(
            'flex min-h-0 flex-col items-start text-left lg:min-h-[420px] lg:justify-center',
            reverse ? 'lg:order-2' : 'lg:order-1',
          )}
        >
          <Eyebrow className="text-[var(--color-paper)]/60">{eyebrow}</Eyebrow>
          <h2 className="relative font-serif text-[36px] leading-[1.08] tracking-tight text-[var(--color-paper)] sm:text-[44px]">
            {headline}
            {highlightHeadline ? (
              <HandwrittenUnderline className="mt-1" width={240} />
            ) : null}
          </h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-[var(--color-paper)]/75">
            {body}
          </p>
          {learnMoreHref && (
            <Link
              href={learnMoreHref}
              className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--color-paper)] underline decoration-[var(--color-paper)]/30 decoration-2 underline-offset-4 transition-colors hover:text-[var(--color-paper)]/80"
            >
              See how it works <span aria-hidden>→</span>
            </Link>
          )}
        </ScrollReveal>

        <div className={cn('min-w-0', reverse ? 'lg:order-1' : 'lg:order-2')}>
          <FloatingUiCard variant="dark" parallax rotate={reverse ? -1 : 1}>
            <div className="rounded-[1.25rem] bg-[var(--color-paper)] p-4 text-[var(--color-ink)] sm:p-6">
              {children}
            </div>
          </FloatingUiCard>
        </div>
      </div>
    </EditorialSection>
  );
}
