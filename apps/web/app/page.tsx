import { DotGridPage } from '@/components/landing-v2/DotGridSurface';
import { GlassNav } from '@/components/landing-v2/GlassNav';
import { HeroSection } from '@/components/landing-v2/sections/HeroSection';
import { ProofStrip } from '@/components/landing-v2/sections/ProofStrip';
import { FeatureCapture } from '@/components/landing-v2/sections/FeatureCapture';
import { FeatureBoard } from '@/components/landing-v2/sections/FeatureBoard';
import { FeaturePlanMyDay } from '@/components/landing-v2/sections/FeaturePlanMyDay';
import { FeatureBento } from '@/components/landing-v2/sections/FeatureBento';
import { FoundersNote } from '@/components/landing-v2/sections/FoundersNote';
import { BrunoSection } from '@/components/landing-v2/sections/BrunoSection';
import { PricingSection } from '@/components/landing-v2/sections/PricingSection';
import { FaqSection } from '@/components/landing-v2/sections/FaqSection';
import { FooterCinematicCta } from '@/components/landing-v2/sections/FooterCinematicCta';
import { LandingFooter } from '@/components/landing-v2/sections/LandingFooter';
import { FeatureConnectTrack } from '@/components/landing-v2/motion/ScrollConnectLine';

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
        </FeatureConnectTrack>
        <FeatureBento />
        <FoundersNote />
        <BrunoSection />
        <PricingSection />
        <FaqSection />
      </main>
      <FooterCinematicCta />
      <LandingFooter />
    </DotGridPage>
  );
}
