'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eyebrow } from '../Eyebrow';
import { ScrollReveal } from '../motion/ScrollReveal';
import { OceanPillButton } from '../editorial/OceanPillButton';
import {
  FREE_PERKS,
  formatProPrice,
  formatStudentPrice,
  PRICING_COPY,
  PRO_PERKS,
  proAnnualBilledNote,
  proTrialFootnoteWithBilling,
} from '@/lib/marketing/pricing';

function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-2.5 w-2.5">
      <path
        d="M3 8.5L6.2 12L13 4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PricingSection() {
  const [annual, setAnnual] = useState(true);
  const proPrice = formatProPrice(annual);
  const eduPrice = formatStudentPrice(annual);

  return (
    <section id="pricing" className="scroll-mt-24 px-6 py-16 sm:py-24">
      <ScrollReveal className="mx-auto max-w-5xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Eyebrow>{PRICING_COPY.heroEyebrow}</Eyebrow>
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-[var(--color-ink)] md:text-5xl">
            {PRICING_COPY.landingHeadline}
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)] md:text-base">
            {PRICING_COPY.landingSubhead}
          </p>
        </div>

        <div className="mx-auto mb-10 flex w-fit items-center justify-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-1">
          {(
            [
              { key: false, label: 'Monthly' },
              { key: true, label: PRICING_COPY.annualToggleLabel },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={annual === key}
              onClick={() => setAnnual(key)}
              className={
                annual === key
                  ? 'rounded-full bg-[var(--color-paper)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink)] shadow-sm'
                  : 'rounded-full px-4 py-2 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]'
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-[32px] border border-[var(--color-line)] bg-[var(--color-paper)] p-8 shadow-[0_16px_48px_rgba(20,20,20,0.06)] md:p-10">
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
              {PRICING_COPY.freeTierLabel}
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-serif text-5xl text-[var(--color-ink)]">$0</span>
              <span className="text-sm font-medium text-[var(--color-ink-soft)]">
                {PRICING_COPY.freeTierPriceSuffix}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              {PRICING_COPY.freeTierSubtitle}
            </p>

            <ul className="mt-7 flex flex-1 flex-col gap-3.5 text-sm text-[var(--color-ink-soft)]">
              {FREE_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-[var(--color-forest-soft)] text-[var(--color-forest-band)]">
                    <CheckMark />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="mt-8 w-full rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-6 py-3 text-center text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)]"
            >
              {PRICING_COPY.freeTierCta}
            </Link>
            <p className="mt-3 text-center text-[12px] text-[var(--color-ink-soft)]">
              {PRICING_COPY.freeTierCtaNote}
            </p>
          </div>

          <div className="relative flex flex-col overflow-hidden rounded-[32px] bg-[var(--color-charcoal)] p-8 text-[var(--color-paper)] shadow-[0_24px_80px_rgba(20,20,20,0.18)] md:p-10">
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--color-paper)]/70">
              Pro
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-serif text-5xl text-[var(--color-paper)]">{proPrice}</span>
              <span className="text-sm font-medium text-[var(--color-paper)]/70">
                / month
              </span>
            </div>
            {annual ? (
              <p className="mt-2 text-[13px] font-medium text-[var(--color-paper)]/70">
                {proAnnualBilledNote()}
              </p>
            ) : null}
            <p className="mt-3 rounded-xl bg-[var(--color-ocean)]/20 px-3 py-2 text-[14px] font-medium text-[var(--color-ocean-soft)]">
              Students: {eduPrice}/mo with a verified .edu email — same product, half price.
            </p>

            <ul className="mt-7 flex flex-1 flex-col gap-3.5 text-sm text-[var(--color-paper)]/85">
              {PRO_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-[var(--color-ocean)] text-[var(--color-charcoal)]">
                    <CheckMark />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <OceanPillButton href="/signup?plan=pro" className="mt-8 w-full justify-center">
              {PRICING_COPY.proTrialCta}
            </OceanPillButton>
            <p className="mt-4 text-center text-[12px] text-[var(--color-paper)]/70">
              {proTrialFootnoteWithBilling(annual)}
            </p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
