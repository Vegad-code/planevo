import Image from 'next/image';
import { DeviceMobile, Globe } from '@phosphor-icons/react/dist/ssr';
import { CanvasIcon, GoogleIcon } from '@/components/icons/BrandIcons';
import { FeatureShowcase } from '@/components/landing-v2/sections/FeatureShowcase';
import { PlanMyDayTimeline } from '@/components/landing-v2/demo/PlanMyDayTimeline';
import { CalendarDemoCard } from '@/components/landing-v2/demo/StaticDemoCards';
import { HiggsfieldBlurBg } from '@/components/marketing/HiggsfieldBlurBg';
import { MARKETING_BLUR_IMAGES } from '@/lib/marketing/assets';
import { OceanPillButton } from '@/components/landing-v2/editorial/OceanPillButton';

const PLATFORMS = [
  { label: 'Google Calendar', icon: <GoogleIcon className="h-4 w-4" /> },
  { label: 'Canvas LMS', icon: <CanvasIcon className="h-4 w-4" /> },
  { label: 'Web', icon: <Globe size={16} weight="regular" /> },
  { label: 'iOS & Android', icon: <DeviceMobile size={16} weight="regular" /> },
];

const DETAIL_CARDS = [
  {
    title: 'Gap detection',
    body: 'Planevo finds real open time between classes, practice, and meetings.',
  },
  {
    title: 'No double-booking',
    body: 'Never schedules over something already on your calendar.',
  },
  {
    title: 'Canvas import',
    body: 'Assignments land with due dates — no manual re-entry.',
  },
  {
    title: 'Adaptive replan',
    body: 'When the day changes, your plan moves with it.',
  },
];

export function FeaturesCalendarSection() {
  return (
    <section id="calendar" className="scroll-mt-32">
      <FeatureShowcase
        id="calendar-plan"
        eyebrow="Plan my day · Availability engine"
        headline="Planned into your real free time."
        body="One click runs your plate through your actual calendar. Planevo finds the gaps between classes, practice, and commitments — and places the work there."
        learnMoreHref="/signup"
        highlightHeadline
      >
        <HiggsfieldBlurBg src={MARKETING_BLUR_IMAGES.calendar}>
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
        </HiggsfieldBlurBg>
      </FeatureShowcase>

      <FeatureShowcase
        id="calendar-week"
        eyebrow="Calendar · The whole week"
        headline="Your week, honestly."
        body="Google Calendar syncs in. See classes, practice, and meetings at once — Planevo plans around what is already there."
        learnMoreHref="/signup"
        reverse
      >
        <CalendarDemoCard />
      </FeatureShowcase>

      <div className="bg-[var(--color-paper)] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="font-serif text-3xl tracking-tight text-[var(--color-ink)] sm:text-4xl">
            Works with your real schedule
          </h3>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
            Connect once. Planevo reads your calendar and Canvas — it never overwrites what is already booked.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {PLATFORMS.map(({ label, icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-[13px] font-medium text-[var(--color-ink)]"
              >
                {icon}
                {label}
              </span>
            ))}
          </div>
          <div className="mt-8">
            <OceanPillButton href="/signup">Connect in 2 minutes</OceanPillButton>
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2">
          {DETAIL_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[var(--color-line)] p-6"
            >
              <h4 className="text-[15px] font-semibold text-[var(--color-ink)]">
                {card.title}
              </h4>
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
