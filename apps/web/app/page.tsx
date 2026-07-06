import { DotGridPage } from '@/components/landing-v2/DotGridSurface';
import { GlassNav } from '@/components/landing-v2/GlassNav';
import { HeroSection } from '@/components/landing-v2/sections/HeroSection';
import { ProofStrip } from '@/components/landing-v2/sections/ProofStrip';
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

export default function HomePage() {
  return (
    <DotGridPage className="selection:bg-[var(--color-surface-muted)]">
      <GlassNav />
      <main>
        <HeroSection />
        <ProofStrip />
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
