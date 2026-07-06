import { cn } from '@/lib/utils';

/**
 * Static desktop browser chrome around real product UI — honest product proof
 * (the product is a web command board, not a phone chat app).
 */
export function BrowserFrame({
  children,
  className,
  url = 'planevo.app/command',
}: {
  children: React.ReactNode;
  className?: string;
  url?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] shadow-xl',
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-cream-2)]/40 px-4 py-2.5">
        <div aria-hidden className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-rose)]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-honey)]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-sage)]/70" />
        </div>
        <div className="flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1 text-center font-mono text-[10px] tracking-wide text-[var(--color-ink-soft)]">
          {url}
        </div>
        <span aria-hidden className="w-8" />
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}
