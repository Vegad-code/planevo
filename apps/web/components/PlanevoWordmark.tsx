import { cn } from '@/lib/utils';

/** Brand wordmark beside the logo icon — Plan in ink, evo in honey accent. */
export function PlanevoWordmark({
  className,
  size = 'md',
  evoClassName,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  evoClassName?: string;
}) {
  const sizeClass =
    size === 'lg'
      ? 'text-[32px] sm:text-4xl'
      : size === 'sm'
        ? 'text-[20px]'
        : 'text-[22px]';

  return (
    <span
      className={cn(
        'flex items-baseline font-serif font-semibold leading-none tracking-tight select-none',
        sizeClass,
        className,
      )}
    >
      <span className="text-[var(--color-ink)]">Plan</span>
      <span
        className={cn(
          'italic text-[var(--color-honey-deep)]',
          evoClassName,
        )}
      >
        evo
      </span>
    </span>
  );
}
