'use client';

import Image from 'next/image';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MARKETING_BLUR_IMAGES } from '@/lib/marketing/assets';

const DEFAULT_BLUR_SRC = MARKETING_BLUR_IMAGES.default;

const SCRIM = {
  dark: 'bg-[linear-gradient(180deg,rgba(20,20,20,0.2)_0%,rgba(20,20,20,0.55)_100%)]',
  light:
    'bg-[linear-gradient(180deg,rgba(255,255,235,0.55)_0%,rgba(255,255,235,0.82)_100%)]',
} as const;

export function HiggsfieldBlurBg({
  src = DEFAULT_BLUR_SRC,
  variant = 'light',
  className,
  children,
}: {
  src?: string;
  variant?: 'dark' | 'light';
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn('relative min-h-[280px] overflow-hidden rounded-[1.25rem]', className)}>
      <Image
        src={src}
        alt=""
        fill
        className={cn('object-cover', !reduceMotion && 'scale-[1.03]')}
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      <div aria-hidden className={cn('absolute inset-0', SCRIM[variant])} />
      <div className="relative z-10 p-4 sm:p-6">{children}</div>
    </div>
  );
}
