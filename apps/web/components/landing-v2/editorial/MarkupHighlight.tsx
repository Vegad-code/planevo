import { cn } from '@/lib/utils';

interface MarkupHighlightProps {
  children: React.ReactNode;
  className?: string;
}

export function MarkupHighlight({ children, className }: MarkupHighlightProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md bg-[var(--color-markup)]/25 px-1.5 py-0.5 text-[12px] font-medium text-[var(--color-ink)] ring-1 ring-[var(--color-markup)]/40',
        className,
      )}
    >
      {children}
    </span>
  );
}
