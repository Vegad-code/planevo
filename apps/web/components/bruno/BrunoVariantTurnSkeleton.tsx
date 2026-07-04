'use client';

import { cn } from '@/lib/utils';

type BrunoVariantTurnSkeletonProps = {
  role: 'user' | 'assistant';
  className?: string;
};

export function BrunoVariantTurnSkeleton({
  role,
  className,
}: BrunoVariantTurnSkeletonProps) {
  if (role === 'user') {
    return (
      <div
        className={cn(
          'max-w-[min(82vw,34rem)] rounded-2xl border border-[var(--color-settings-brand)]/10 bg-[var(--color-settings-brand)]/10 px-4 py-2.5',
          className
        )}
      >
        <div className="flex flex-col gap-2">
          <div className="h-3.5 w-28 animate-pulse rounded bg-[var(--color-settings-border)]/70" />
          <div className="h-3.5 w-40 animate-pulse rounded bg-[var(--color-settings-border)]/50" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full max-w-[min(92%,48rem)] rounded-2xl border border-[var(--color-settings-border)]/60 bg-[var(--color-settings-card)]/30 px-4 py-3 md:px-5',
        className
      )}
    >
      <div className="flex flex-col gap-2.5">
        <div className="h-3.5 w-[92%] animate-pulse rounded bg-[var(--color-settings-border)]/70" />
        <div className="h-3.5 w-[84%] animate-pulse rounded bg-[var(--color-settings-border)]/55" />
        <div className="h-3.5 w-[76%] animate-pulse rounded bg-[var(--color-settings-border)]/45" />
        <div className="h-3.5 w-[64%] animate-pulse rounded bg-[var(--color-settings-border)]/35" />
      </div>
    </div>
  );
}
