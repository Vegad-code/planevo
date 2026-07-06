import { cn } from '@/lib/utils';

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'mb-4 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--color-ink-soft)]',
        className,
      )}
    >
      {children}
    </p>
  );
}
