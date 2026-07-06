import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Footer-only misty forest wallpaper — blends into white page above via gradient overlay.
 */
export function FooterBrandBand() {
  return (
    <section aria-hidden className="relative h-[min(40vw,320px)] overflow-hidden">
      <Image
        src="/landing/bg/forest.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-bottom"
      />
      <div
        aria-hidden
        className={cn(
          'absolute inset-0',
          'bg-[linear-gradient(180deg,var(--color-paper)_0%,transparent_35%,transparent_100%)]',
        )}
      />
    </section>
  );
}
