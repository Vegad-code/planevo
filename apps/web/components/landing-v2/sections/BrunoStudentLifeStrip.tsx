'use client';

import Image from 'next/image';

const SCENES = [
  {
    id: 'between-classes',
    title: 'Between classes',
    caption: 'A quick capture before the next lecture',
    src: '/landing/bruno-scene-between-classes.webp',
  },
  {
    id: 'late-night',
    title: 'Late-night library',
    caption: 'When the week finally slows down',
    src: '/landing/bruno-scene-library.webp',
  },
  {
    id: 'campus-walk',
    title: 'Across campus',
    caption: 'Plans that move when you do',
    src: '/landing/bruno-scene-campus.webp',
  },
] as const;

/**
 * Student-life vignette strip — Higgsfield editorial illustrations.
 * Titles live only in the overlay (images are generated text-free).
 */
export function BrunoStudentLifeStrip() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-paper)]/55">
          Student life · Real moments
        </p>
        <h3 className="mt-3 font-serif text-[28px] leading-tight text-[var(--color-paper)] sm:text-[32px]">
          Built for weeks that never stay still
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {SCENES.map((scene) => (
          <article
            key={scene.id}
            className="group relative overflow-hidden rounded-2xl border border-[var(--color-paper)]/15 bg-[var(--color-charcoal)]"
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={scene.src}
                alt=""
                fill
                unoptimized={scene.id === 'late-night'}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-charcoal)] via-[var(--color-charcoal)]/35 to-transparent"
                aria-hidden
              />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h4 className="font-serif text-[18px] leading-tight text-[var(--color-paper)]">
                  {scene.title}
                </h4>
                <p className="mt-1 text-[12px] leading-snug text-[var(--color-paper)]/75">
                  {scene.caption}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
