import { cn } from '@/lib/utils';

export type StageBackdropVariant = 'sky' | 'meadow' | 'neutral';

const GRADIENT_CLASS: Record<StageBackdropVariant, string> = {
  sky: 'bg-[linear-gradient(180deg,#DCEAF2_0%,#FFFDF5_100%)]',
  meadow: 'bg-[linear-gradient(180deg,#D3E4D9_0%,#FFFDF5_100%)]',
  neutral: 'bg-[linear-gradient(180deg,#EFE3C4_0%,#FFFDF5_100%)]',
};

export function StageBackdrop({
  variant,
  className,
}: {
  variant: StageBackdropVariant;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'absolute inset-0 border border-[var(--color-line)]',
        GRADIENT_CLASS[variant],
        className,
      )}
    />
  );
}
