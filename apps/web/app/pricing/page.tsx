import type { Metadata } from 'next';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import {
  PricingComparisonTable,
  PricingHero,
  PricingTierCards,
  StudentDiscountBand,
} from '@/components/marketing/pricing/PricingSections';
import { TimeSavingsCalculator } from '@/components/marketing/pricing/TimeSavingsCalculator';
import { PricingFaqSection } from '@/components/marketing/pricing/PricingFaqSection';
import { PRICING_COPY } from '@/lib/marketing/pricing';

export const metadata: Metadata = {
  title: 'Pricing',
  description: PRICING_COPY.pageDescription,
};

export default function PricingPage() {
  return (
    <MarketingPageShell>
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <PricingHero />
          <div className="mt-12">
            <PricingTierCards />
          </div>
          <StudentDiscountBand />
          <PricingComparisonTable />
          <TimeSavingsCalculator />
        </div>
      </section>
      <PricingFaqSection />
    </MarketingPageShell>
  );
}
