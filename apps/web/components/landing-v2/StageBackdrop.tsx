import { cn } from '@/lib/utils';

export type StageBackdropVariant = 'sky' | 'meadow' | 'neutral';

const GRADIENT_CLASS: Record<StageBackdropVariant, string> = {
  sky: 'bg-[linear-gradient(180deg,#EBF3F7_0%,#FFFDF5_100%)]',
  meadow: 'bg-[linear-gradient(180deg,#E4EEE7_0%,#FFFDF5_100%)]',
  neutral: 'bg-[linear-gradient(180deg,#F4EDD9_0%,#FFFDF5_100%)]',
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
      className={cn('absolute inset-0', GRADIENT_CLASS[variant], className)}
    />
  );
}
