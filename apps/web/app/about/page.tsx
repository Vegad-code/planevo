import type { Metadata } from 'next';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { AboutBlurHero } from '@/components/marketing/about/AboutBlurHero';
import { ValuesGrid } from '@/components/marketing/about/ValuesGrid';
import {
  AboutFounderSection,
  StudentSocialProof,
} from '@/components/marketing/about/AboutSections';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Planevo is the availability-first daily planner for students — built around real open time, not fantasy productivity.',
};

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <div className="pb-8 pt-4 sm:pt-6">
        <AboutBlurHero />
      </div>
      <ValuesGrid />
      <AboutFounderSection />
      <StudentSocialProof />
    </MarketingPageShell>
  );
}
