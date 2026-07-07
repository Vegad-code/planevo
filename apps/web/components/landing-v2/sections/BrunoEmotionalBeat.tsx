'use client';

import Image from 'next/image';

/**
 * Single Bruno emotional beat — character cutout beside section close.
 */
export function BrunoEmotionalBeat() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <div className="relative h-32 w-32">
        <Image
          src="/landing/bruno-pose-wave.webp"
          alt="Bruno waving"
          fill
          className="object-contain"
          sizes="128px"
        />
      </div>
      <p className="font-serif text-[22px] leading-snug text-[var(--color-paper)]">
        A companion who proposes — never assumes.
      </p>
      <p className="max-w-sm text-[14px] leading-relaxed text-[var(--color-paper)]/70">
        Bruno is inside Planevo when you need a hand. He reads your context, suggests the next move, and waits for your OK.
      </p>
    </div>
  );
}
