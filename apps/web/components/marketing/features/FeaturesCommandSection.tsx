'use client';

import { FeatureShowcase } from '@/components/landing-v2/sections/FeatureShowcase';
import { CommandHeroDemo } from '@/components/landing-v2/demo/CommandHeroDemo';
import { CaptureFlowDemo } from '@/components/landing-v2/demo/CaptureFlowDemo';
import { FeatureCapture } from '@/components/landing-v2/sections/FeatureCapture';
import { FeatureBoard } from '@/components/landing-v2/sections/FeatureBoard';
import { FeatureConnectTrack } from '@/components/landing-v2/motion/ScrollConnectLine';
import { HiggsfieldBlurBg } from '@/components/marketing/HiggsfieldBlurBg';
import { MARKETING_BLUR_IMAGES } from '@/lib/marketing/assets';

const COMMAND_ACCORDION = [
  {
    q: 'Capture',
    a: 'Type, paste, or say everything on your plate in one messy breath.',
  },
  {
    q: 'Preview',
    a: 'See structured responsibilities before anything lands on your board.',
  },
  {
    q: 'Calm board',
    a: 'Now, Today, and Due soon — one scannable list instead of five apps.',
  },
];

export function FeaturesCommandSection() {
  return (
    <section id="command" className="scroll-mt-32">
      <FeatureConnectTrack>
        <FeatureCapture />
        <FeatureBoard />
      </FeatureConnectTrack>

      <FeatureShowcase
        id="command-hero"
        eyebrow="Command · End to end"
        headline="Dump the chaos. Get a calm board."
        body="Watch a messy capture turn into real responsibilities — previewed, confirmed, and sorted by when they actually matter."
        learnMoreHref="/signup"
      >
        <HiggsfieldBlurBg src={MARKETING_BLUR_IMAGES.command}>
          <CommandHeroDemo />
        </HiggsfieldBlurBg>
      </FeatureShowcase>

      <FeatureShowcase
        id="command-flow"
        eyebrow="Capture flow · Preview first"
        headline="Confirm before it commits."
        body="Nothing hits your board until you say so. Review the structured preview, tweak if you need to, then confirm."
        learnMoreHref="/signup"
        reverse
      >
        <CaptureFlowDemo />
      </FeatureShowcase>

      <div className="bg-[var(--color-paper)] px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col">
            {COMMAND_ACCORDION.map((item) => (
              <details
                key={item.q}
                className="group border-b border-[var(--color-line)] py-5 first:pt-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="text-[var(--color-ink-soft)] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
