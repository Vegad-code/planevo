import Image from 'next/image';
import { Eyebrow } from '@/components/landing-v2/Eyebrow';
import { MARKETING_BLUR_IMAGES } from '@/lib/marketing/assets';

export function AboutBlurHero() {
  return (
    <section className="relative mx-3 overflow-hidden rounded-[28px] sm:mx-4 sm:rounded-[36px] lg:mx-5 lg:rounded-[44px]">
      <div className="relative min-h-[min(56vh,520px)] w-full">
        <Image
          src={MARKETING_BLUR_IMAGES.about}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,20,20,0.35)_0%,rgba(20,20,20,0.72)_100%)]"
        />
        <div className="relative z-10 flex min-h-[min(56vh,520px)] flex-col items-center justify-center px-6 py-20 text-center sm:px-10">
          <Eyebrow className="text-[var(--color-paper)]/70">About Planevo</Eyebrow>
          <h1 className="max-w-3xl font-serif text-[40px] leading-[1.06] tracking-tight text-[var(--color-paper)] sm:text-[56px]">
            The availability-first planner.
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[var(--color-paper)]/85 sm:text-[18px]">
            We rebuild your day around real open time — and adapt when life gets in the
            way. Built for students whose weeks never quite stay still.
          </p>
        </div>
      </div>
    </section>
  );
}
