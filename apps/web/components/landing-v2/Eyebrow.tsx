import { cn } from '@/lib/utils';

/** Section eyebrow — the only mono-caps label allowed on the landing page. */
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
