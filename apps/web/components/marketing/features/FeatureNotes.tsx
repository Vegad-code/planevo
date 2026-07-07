import { FeatureShowcase } from '@/components/landing-v2/sections/FeatureShowcase';
import { AnimatedNotesDemo } from '@/components/landing-v2/demo/AnimatedFeatureDemos';
import { HiggsfieldBlurBg } from '@/components/marketing/HiggsfieldBlurBg';
import { MARKETING_BLUR_IMAGES } from '@/lib/marketing/assets';

const ACCORDION_ITEMS = [
  {
    q: 'Quick capture',
    a: 'Jot a thought between classes — tied to your day, not lost in a random doc.',
  },
  {
    q: 'Bruno organize',
    a: 'Ask Bruno to structure messy notes into outlines you can actually study from.',
  },
  {
    q: 'Flashcards',
    a: 'Turn key facts into cards in a tap when exam week hits.',
  },
];

export function FeatureNotes() {
  return (
    <section id="notes" className="scroll-mt-32">
      <FeatureShowcase
        id="notes-showcase"
        eyebrow="Notes · Capture & study"
        headline="Capture without the clutter."
        body="Quick notes next to your tasks. Bruno can organize messy captures, and flashcards are one tap away when you need to review."
        learnMoreHref="/signup"
        reverse
      >
        <HiggsfieldBlurBg src={MARKETING_BLUR_IMAGES.notes}>
          <AnimatedNotesDemo />
        </HiggsfieldBlurBg>
      </FeatureShowcase>

      <div className="bg-[var(--color-paper)] px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col">
            {ACCORDION_ITEMS.map((item) => (
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
