import { cn } from '@/lib/utils';

/** Attio / Linear dot grid layer — sits on littlebird white (--color-paper). */
export function DotGridLayer({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 marketing-dot-grid', className)}
    />
  );
}

/** Soft honey + forest glows pulled from generated palette, kept very light. */
export function HeroAccentGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div className="absolute -left-[8%] top-[6%] h-[28rem] w-[28rem] rounded-full bg-[var(--color-honey)]/[0.05] blur-3xl" />
      <div className="absolute -right-[6%] top-[18%] h-[22rem] w-[22rem] rounded-full bg-[var(--color-forest)]/[0.04] blur-3xl" />
      <div className="absolute bottom-[12%] left-[28%] h-48 w-48 rounded-full bg-[var(--color-honey)]/[0.035] blur-3xl" />
      {/* Honey accent dots — echo generated backgrounds at lower weight */}
      <div className="absolute left-[18%] top-[22%] h-1.5 w-1.5 rounded-full bg-[var(--color-honey)]/30" />
      <div className="absolute left-[42%] top-[38%] h-1 w-1 rounded-full bg-[var(--color-honey)]/20" />
      <div className="absolute right-[24%] top-[28%] h-1.5 w-1.5 rounded-full bg-[var(--color-honey)]/25" />
      <div className="absolute bottom-[32%] right-[18%] h-1 w-1 rounded-full bg-[var(--color-forest)]/20" />
    </div>
  );
}

/** Page shell: littlebird white + dot grid across full scroll height. */
export function DotGridPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'marketing-scope relative min-h-screen overflow-x-clip bg-[var(--color-paper)] font-sans text-[var(--color-ink)]',
        className,
      )}
    >
      <DotGridLayer />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Auth split-panel right column — soft glow accents over shared page grid. */
export function AuthPanelBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn('relative hidden overflow-hidden lg:block', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute bottom-[18%] right-[12%] h-56 w-56 rounded-full bg-[var(--color-honey)]/[0.06] blur-3xl" />
        <div className="absolute left-[20%] top-[15%] h-40 w-40 rounded-full bg-[var(--color-forest)]/[0.04] blur-3xl" />
        <div className="absolute right-[30%] top-[45%] h-1.5 w-1.5 rounded-full bg-[var(--color-honey)]/25" />
      </div>
    </div>
  );
}
