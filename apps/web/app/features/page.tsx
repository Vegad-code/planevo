import type { Metadata } from 'next';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { FeatureTabNav } from '@/components/marketing/features/FeatureTabNav';
import { FeaturesCommandSection } from '@/components/marketing/features/FeaturesCommandSection';
import { FeaturesCalendarSection } from '@/components/marketing/features/FeaturesCalendarSection';
import { FeatureTasks } from '@/components/marketing/features/FeatureTasks';
import { FeatureNotes } from '@/components/marketing/features/FeatureNotes';
import { FeaturesReadyCta } from '@/components/marketing/features/FeaturesReadyCta';
import { ProofStrip } from '@/components/landing-v2/sections/ProofStrip';
import { BrunoSection } from '@/components/landing-v2/sections/BrunoSection';
import { Eyebrow } from '@/components/landing-v2/Eyebrow';
import { OceanPillButton } from '@/components/landing-v2/editorial/OceanPillButton';
import { ScrollReveal } from '@/components/landing-v2/motion/ScrollReveal';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Command, calendar, tasks, and notes — see how Planevo plans around your real availability with interactive demos.',
};

export default function FeaturesPage() {
  return (
    <MarketingPageShell>
      <section className="px-6 pb-8 pt-10 sm:pt-14">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <Eyebrow>Everything in Planevo</Eyebrow>
          <h1 className="font-serif text-[40px] leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-[56px]">
            Plan around your <em className="not-italic text-[var(--color-ocean-deep)]">real life</em>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--color-ink-soft)] sm:text-[18px]">
            Availability-first daily planning for students and builders. Dump chaos,
            see your week honestly, and let Bruno help — with your approval, not
            autopilot.
          </p>
          <div className="mt-8">
            <OceanPillButton href="/signup">Start free</OceanPillButton>
          </div>
        </ScrollReveal>
      </section>

      <FeatureTabNav />
      <FeaturesCommandSection />
      <FeaturesCalendarSection />
      <FeatureTasks />
      <FeatureNotes />
      <BrunoSection />
      <ProofStrip />
      <FeaturesReadyCta />
    </MarketingPageShell>
  );
}
