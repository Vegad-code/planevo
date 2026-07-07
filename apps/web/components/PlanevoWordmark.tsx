import { cn } from '@/lib/utils';

/** Brand wordmark beside the logo icon. */
export function PlanevoWordmark({
  className,
  size = 'md',
  evoClassName,
  variant = 'full',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  evoClassName?: string;
  /** Nav-style mark: "Plan" only in solid italic serif. */
  variant?: 'full' | 'plan';
}) {
  const sizeClass =
    size === 'lg'
      ? 'text-[32px] sm:text-4xl'
      : size === 'sm'
        ? 'text-[18px]'
        : 'text-[22px]';

  if (variant === 'plan') {
    return (
      <span
        className={cn(
          'font-serif text-[var(--color-ink)] italic font-semibold leading-none tracking-tight select-none',
          sizeClass,
          className,
        )}
      >
        Plan
      </span>
    );
  }

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
          'italic text-[var(--color-ink)]',
          evoClassName,
        )}
      >
        evo
      </span>
    </span>
  );
}
