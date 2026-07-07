'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { Check, X } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { Eyebrow } from '@/components/landing-v2/Eyebrow';
import { OceanPillButton } from '@/components/landing-v2/editorial/OceanPillButton';
import { ScrollReveal } from '@/components/landing-v2/motion/ScrollReveal';
import {
  COMPARISON_GROUPS,
  formatProPrice,
  formatStudentPrice,
  FREE_PERKS,
  PRICING_COPY,
  PRO_PERKS,
  proAnnualBilledNote,
  proTrialFootnoteWithBilling,
} from '@/lib/marketing/pricing';
import { redirectToCheckout } from '@/hooks/use-subscription';
import { createClient } from '@/lib/supabase/client';

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

export function PricingTierCards() {
  const [annual, setAnnual] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const proPrice = formatProPrice(annual);
  const eduPrice = formatStudentPrice(annual);

  const handleProCheckout = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await redirectToCheckout(annual ? 'annual' : 'monthly');
      } else {
        router.push('/signup?plan=pro');
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <>
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
            <span className="text-sm font-medium text-[var(--color-paper)]/70">/ month</span>
          </div>
          {annual ? (
            <p className="mt-2 text-[13px] font-medium text-[var(--color-paper)]/70">
              {proAnnualBilledNote()}
            </p>
          ) : null}
          <p
            id="edu"
            className="mt-3 rounded-xl bg-[var(--color-ocean)]/20 px-3 py-2 text-[14px] font-medium text-[var(--color-ocean-soft)]"
          >
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
          <button
            type="button"
            disabled={loading}
            onClick={handleProCheckout}
            className="mt-8 w-full rounded-full bg-[var(--color-ocean)] px-6 py-3 text-center text-[15px] font-semibold text-[var(--color-charcoal)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Loading…' : PRICING_COPY.proTrialCta}
          </button>
          <p className="mt-4 text-center text-[12px] text-[var(--color-paper)]/70">
            {proTrialFootnoteWithBilling(annual)}
          </p>
        </div>
      </div>
    </>
  );
}

export function PricingHero() {
  return (
    <ScrollReveal className="mx-auto max-w-2xl text-center">
      <Eyebrow>{PRICING_COPY.heroEyebrow}</Eyebrow>
      <h1 className="font-serif text-4xl leading-tight tracking-tight text-[var(--color-ink)] md:text-6xl">
        Pricing
      </h1>
      <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)] md:text-base">
        {PRICING_COPY.heroSubhead}
      </p>
    </ScrollReveal>
  );
}

export function StudentDiscountBand() {
  return (
    <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-ocean-soft)]/40 px-6 py-5 sm:flex-row">
      <p className="text-center text-[15px] font-medium text-[var(--color-ink)] sm:text-left">
        Students get the same product at half price — verify your .edu in under a minute.
      </p>
      <OceanPillButton href="/signup?student=true" showArrow={false} className="shrink-0">
        Get started
      </OceanPillButton>
    </div>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check size={18} weight="bold" className="mx-auto text-[var(--color-forest-band)]" />;
  }
  if (value === false) {
    return <X size={18} weight="bold" className="mx-auto text-[var(--color-ink-soft)]" />;
  }
  return <span className="text-[13px] text-[var(--color-ink-soft)]">{value}</span>;
}

export function PricingComparisonTable() {
  return (
    <section className="mt-20">
      <h2 className="text-center font-serif text-3xl tracking-tight text-[var(--color-ink)] md:text-4xl">
        Plans &amp; features
      </h2>
      <div className="mx-auto mt-10 max-w-4xl overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              <th className="py-4 pr-4 text-[13px] font-semibold text-[var(--color-ink)]">
                Feature
              </th>
              <th className="px-4 py-4 text-center text-[13px] font-semibold text-[var(--color-ink)]">
                Free
              </th>
              <th className="px-4 py-4 text-center text-[13px] font-semibold text-[var(--color-ink)]">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_GROUPS.map((group) => (
              <Fragment key={group.title}>
                <tr>
                  <td
                    colSpan={3}
                    className="pt-8 pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]"
                  >
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.feature} className="border-b border-[var(--color-line)]">
                    <td className="py-3.5 pr-4 text-[14px] text-[var(--color-ink)]">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <CellValue value={row.free} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <CellValue value={row.pro} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
