'use client';

import { useMemo, useState } from 'react';
import { ScrollReveal } from '@/components/landing-v2/motion/ScrollReveal';
import { PRO_MONTHLY_PRICE } from '@/lib/marketing/pricing';

const HOURS_PER_WEEK_DEFAULT = 3;
const WAGE_DEFAULT = 15;
const HOURS_SAVED_RATIO = 0.65;

export function TimeSavingsCalculator() {
  const [hoursPerWeek, setHoursPerWeek] = useState(HOURS_PER_WEEK_DEFAULT);
  const [hourlyWage, setHourlyWage] = useState(WAGE_DEFAULT);

  const stats = useMemo(() => {
    const hoursMonthly = Math.round(hoursPerWeek * 4.33);
    const hoursSaved = Math.round(hoursMonthly * HOURS_SAVED_RATIO);
    const timeValue = Math.round(hoursSaved * hourlyWage);
    const netSavings = Math.max(0, timeValue - PRO_MONTHLY_PRICE);
    return { hoursMonthly, hoursSaved, timeValue, netSavings };
  }, [hoursPerWeek, hourlyWage]);

  return (
    <section className="mt-20 overflow-hidden rounded-[32px] bg-[var(--color-forest-band)] px-6 py-12 sm:px-10 sm:py-16">
      <ScrollReveal>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <h2 className="font-serif text-3xl tracking-tight text-[var(--color-paper)] sm:text-4xl">
              Calculate your time back
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-paper)]/80">
              On average, students spend hours re-planning when classes move or deadlines
              shift. Planevo adapts instead of making you start over.
            </p>

            <div className="mt-8 flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[14px] font-medium text-[var(--color-paper)]">
                  I spend{' '}
                  <strong className="font-semibold">{hoursPerWeek}</strong> hours
                  re-planning my week
                </span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="w-full accent-[var(--color-ocean)]"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[14px] font-medium text-[var(--color-paper)]">
                  My time is worth{' '}
                  <strong className="font-semibold">${hourlyWage}</strong>/hour
                </span>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={hourlyWage}
                  onChange={(e) => setHourlyWage(Number(e.target.value))}
                  className="w-full accent-[var(--color-ocean)]"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-paper)]/20 bg-[var(--color-charcoal)]/40 p-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-paper)]/60">
              Monthly, you&rsquo;ll save
            </p>
            <p className="mt-2 font-serif text-5xl text-[var(--color-paper)]">
              ${stats.netSavings.toLocaleString()}/mo
            </p>
            <ul className="mt-6 flex flex-col gap-2 text-[14px] text-[var(--color-paper)]/85">
              <li>Hours spent re-planning: {stats.hoursMonthly}</li>
              <li>Hours saved monthly: {stats.hoursSaved}</li>
              <li>Time value saved: ${stats.timeValue.toLocaleString()}</li>
              <li>Planevo Pro monthly cost: ${PRO_MONTHLY_PRICE.toFixed(2)}</li>
            </ul>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
