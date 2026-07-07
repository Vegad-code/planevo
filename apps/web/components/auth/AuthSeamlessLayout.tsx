import Image from 'next/image';
import { cn } from '@/lib/utils';
import { DotGridLayer } from '@/components/landing-v2/DotGridSurface';
import { AUTH_HERO_DESKTOP_SRC, AUTH_HERO_MOBILE_SRC } from './auth-assets';

interface AuthSeamlessLayoutProps {
  children: React.ReactNode;
  imageSrc?: string;
  mobileImageSrc?: string;
  className?: string;
}

/**
 * Auth canvas — vivid hero on the right, form on paper left, with a single
 * linear fade at the seam (no double-overlay glow).
 */
export function AuthSeamlessLayout({
  children,
  imageSrc = AUTH_HERO_DESKTOP_SRC,
  mobileImageSrc = AUTH_HERO_MOBILE_SRC,
  className,
}: AuthSeamlessLayoutProps) {
  return (
    <div
      className={cn(
        'marketing-scope relative min-h-screen overflow-hidden bg-[var(--color-paper)] font-sans text-[var(--color-ink)] lg:grid lg:grid-cols-2',
        className,
      )}
    >
      {/* Dot grid only on the form side — keeps seam clean */}
      <DotGridLayer className="[mask-image:linear-gradient(to_right,black_0%,black_78%,transparent_100%)]" />

      {/* Form column — solid paper fading out in one smooth band at the seam */}
      <div
        className={cn(
          'relative z-10 flex min-h-screen flex-col justify-center px-8 pb-12 pt-40 sm:px-16 lg:px-20 lg:pt-12 xl:px-28',
          'bg-[var(--color-paper)]',
          'lg:[background:linear-gradient(to_right,var(--color-paper)_0%,var(--color-paper)_78%,rgba(255,255,235,0.5)_88%,transparent_100%)]',
        )}
      >
        {children}
      </div>

      {/* Hero column — image only; no left-edge wash */}
      <div className="relative hidden min-h-screen lg:block">
        <Image
          src={imageSrc}
          alt="Bruno, your Planevo companion, in a cozy study nook"
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
      </div>

      {/* Mobile: hero strip fading into paper below */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-44 overflow-hidden lg:hidden"
      >
        <Image
          src={mobileImageSrc}
          alt=""
          fill
          className="object-cover object-top"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-[var(--color-paper)]" />
      </div>
    </div>
  );
}
