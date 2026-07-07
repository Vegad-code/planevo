import { FeatureShowcase } from '@/components/landing-v2/sections/FeatureShowcase';
import { AnimatedTasksDemo } from '@/components/landing-v2/demo/AnimatedFeatureDemos';
import { HiggsfieldBlurBg } from '@/components/marketing/HiggsfieldBlurBg';
import { MARKETING_BLUR_IMAGES } from '@/lib/marketing/assets';

const DETAIL_CARDS = [
  {
    title: 'Rollover without shame',
    body: 'Overdue work quietly moves to Today instead of piling up in red.',
  },
  {
    title: 'Canvas lands with dates',
    body: 'Assignments sync from Canvas onto your board automatically.',
  },
  {
    title: 'Honest priorities',
    body: 'See what is due this week — not a fantasy backlog.',
  },
  {
    title: 'One source of truth',
    body: 'Manual tasks and imports live in the same honest list.',
  },
];

export function FeatureTasks() {
  return (
    <section id="tasks" className="scroll-mt-32">
      <FeatureShowcase
        id="tasks-showcase"
        eyebrow="Tasks · Honest backlog"
        headline="Work that rolls with you."
        body="Canvas assignments and manual tasks in one list. Check things off, and when the day shifts, overdue work rolls forward without the guilt trip."
        learnMoreHref="/signup"
      >
        <HiggsfieldBlurBg src={MARKETING_BLUR_IMAGES.tasks}>
          <AnimatedTasksDemo />
        </HiggsfieldBlurBg>
      </FeatureShowcase>

      <div className="bg-[var(--color-paper)] px-6 py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2">
          {DETAIL_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
            >
              <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">
                {card.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-ink-soft)]">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
