import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { HeroSection } from '@/components/landing-v2/sections/HeroSection';
import { ProofStrip } from '@/components/landing-v2/sections/ProofStrip';
import { FeatureCapture } from '@/components/landing-v2/sections/FeatureCapture';
import { FeatureBoard } from '@/components/landing-v2/sections/FeatureBoard';
import { FeaturePlanMyDay } from '@/components/landing-v2/sections/FeaturePlanMyDay';
import { FeatureBento } from '@/components/landing-v2/sections/FeatureBento';
import { FoundersNote } from '@/components/landing-v2/sections/FoundersNote';
import { BrunoSection } from '@/components/landing-v2/sections/BrunoSection';
import { FaqSection } from '@/components/landing-v2/sections/FaqSection';
import { FeatureConnectTrack } from '@/components/landing-v2/motion/ScrollConnectLine';

export default function HomePage() {
  return (
    <MarketingPageShell padMain={false}>
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
      <FaqSection />
    </MarketingPageShell>
  );
}
