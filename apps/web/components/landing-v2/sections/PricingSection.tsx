import Link from 'next/link';
import { Eyebrow } from '../Eyebrow';
import { ScrollReveal } from '../motion/ScrollReveal';

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

const FREE_PERKS = [
  'The whole product — capture, calm board, plan my day',
  'Tasks, calendar, and notes',
  'Canvas + Google Calendar sync',
  'Adaptive rollover when the day changes',
  'Bruno, your AI companion — 5 asks a day',
];

const PRO_PERKS = [
  'Everything in Free, with the limits lifted',
  'Unlimited Bruno — including deep thinking',
  'Unlimited plan-my-day + priority replanning',
  'Connected apps: Notion, Slack, Linear',
  'Priority support',
];

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 px-6 py-16 sm:py-24">
      <ScrollReveal className="mx-auto max-w-5xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Eyebrow>Free to start · Pro when you&rsquo;re ready</Eyebrow>
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-[var(--color-ink)] md:text-5xl">
            Start free. Upgrade when you outgrow it.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)] md:text-base">
            Anyone can use Planevo for free — no card, no trial clock. Go Pro to remove the
            limits and unlock the power features.
          </p>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col rounded-[32px] border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-8 shadow-md md:p-10">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">
              Free
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-serif text-5xl text-[var(--color-ink)]">$0</span>
              <span className="font-sans text-sm font-medium text-[var(--color-ink-soft)]">
                / forever
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              Everything you need to plan a real day.
            </p>

            <ul className="mt-7 flex flex-1 flex-col gap-3.5 text-sm text-[var(--color-ink-soft)]">
              {FREE_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-[var(--color-forest-soft)] text-[var(--color-forest)]">
                    <CheckMark />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="mt-8 w-full rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-6 py-3 text-center font-sans text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)]"
            >
              Start free — no card
            </Link>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col overflow-hidden rounded-[32px] border border-[var(--color-ink)] bg-[var(--color-ink)] p-8 text-[var(--color-paper)] shadow-xl md:p-10">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-paper)]/70">
                Pro
              </p>
              <span className="rounded-full bg-[var(--color-honey)] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--color-ink)]">
                .edu saves 50%
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-serif text-5xl text-[var(--color-paper)]">$9.99</span>
              <span className="font-sans text-sm font-medium text-[var(--color-paper)]/70">
                / month
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-paper)]/70">
              $4.99/mo with a verified .edu email.
            </p>

            <ul className="mt-7 flex flex-1 flex-col gap-3.5 text-sm text-[var(--color-paper)]/85">
              {PRO_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-[var(--color-honey)] text-[var(--color-ink)]">
                    <CheckMark />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <Link
              href="/signup?plan=pro"
              className="mt-8 w-full rounded-full bg-[var(--color-paper)] px-6 py-3 text-center font-sans text-[15px] font-semibold text-[var(--color-ink)] transition-transform hover:scale-[1.02]"
            >
              Go Pro
            </Link>
            <p className="mt-4 text-center font-sans text-[12px] text-[var(--color-paper)]/70">
              Upgrade or cancel any time
            </p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
