import type { Metadata } from 'next';
import { DotGridPage } from '@/components/landing-v2/DotGridSurface';
import { GlassNav } from '@/components/landing-v2/GlassNav';
import { HeroSection } from '@/components/landing-v2/sections/HeroSection';
import { FeatureCapture } from '@/components/landing-v2/sections/FeatureCapture';
import { FeatureBoard } from '@/components/landing-v2/sections/FeatureBoard';
import { FeaturePlanMyDay } from '@/components/landing-v2/sections/FeaturePlanMyDay';
import { FeatureSources } from '@/components/landing-v2/sections/FeatureSources';
import { FeatureTasks } from '@/components/landing-v2/sections/FeatureTasks';
import { FeatureCalendar } from '@/components/landing-v2/sections/FeatureCalendar';
import { FeatureNotes } from '@/components/landing-v2/sections/FeatureNotes';
import { BrunoSection } from '@/components/landing-v2/sections/BrunoSection';
import { PricingSection } from '@/components/landing-v2/sections/PricingSection';
import { FaqSection } from '@/components/landing-v2/sections/FaqSection';
import { FinalCta } from '@/components/landing-v2/sections/FinalCta';
import { LandingFooter } from '@/components/landing-v2/sections/LandingFooter';
import { FooterBrandBand } from '@/components/landing-v2/sections/FooterBrandBand';
import { FeatureConnectTrack } from '@/components/landing-v2/motion/ScrollConnectLine';
import { AdaptWithYouSection } from '@/components/landing-v2/sections/AdaptWithYouSection';

export const metadata: Metadata = {
  title: 'Planevo — A plan that adapts. Never breaks.',
  description:
    'Free for students and high-performers whose calendars change faster than they can replan. Planevo builds each day around your real availability — then quietly adapts when life gets in the way. Go Pro to unlock everything.',
  keywords: [
    'student planner',
    'free planner',
    'calendar planning',
    'Canvas sync',
    'plan my day',
    'student productivity',
    'time management',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://planevo.ai',
    title: 'Planevo — A plan that adapts. Never breaks.',
    description:
      'Dump everything on your plate — free. Planevo turns it into a calm board of real responsibilities, then places the work into the real free time on your calendar.',
  },
};

export default function HomePage() {
  return (
    <DotGridPage className="selection:bg-[var(--color-surface-muted)]">
      <GlassNav />
      <main>
        <HeroSection />
        <FeatureConnectTrack>
          <FeatureCapture />
          <FeatureBoard />
          <FeaturePlanMyDay />
          <FeatureSources />
          <FeatureTasks />
          <FeatureCalendar />
          <FeatureNotes />
        </FeatureConnectTrack>
        <AdaptWithYouSection />
        <BrunoSection />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
      <FooterBrandBand />
    </DotGridPage>
  );
}
