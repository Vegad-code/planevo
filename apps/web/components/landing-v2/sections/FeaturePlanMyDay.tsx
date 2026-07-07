import Image from 'next/image';
import { FeatureShowcase } from './FeatureShowcase';
import { PlanMyDayTimeline } from '../demo/PlanMyDayTimeline';

export function FeaturePlanMyDay() {
  return (
    <FeatureShowcase
      id="plan"
      eyebrow="Plan my day · Availability engine"
      headline="Planned into your real free time."
      body="One click runs your plate through your actual calendar. Planevo finds the gaps between classes, practice, and commitments — and places the work there. When the day changes, Bruno can help repair it — always with your approval."
      learnMoreHref="/signup"
      highlightHeadline
      blurSrc="plan"
    >
      <div className="mx-auto max-w-sm">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-[var(--color-belly)]">
            <Image src="/landing/bruno-face-160.png" alt="" width={20} height={20} />
          </span>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
            Bruno · Plan my day
          </p>
        </div>
        <PlanMyDayTimeline trigger="inView" />
      </div>
    </FeatureShowcase>
  );
}
