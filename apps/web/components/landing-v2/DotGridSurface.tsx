import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Attio / Linear dot grid layer — optional texture on Wispr cream paper. */
export function DotGridLayer({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 marketing-dot-grid', className)}
    />
  );
}

/** Page shell: Wispr cream paper (#FFFFEB), flat canvas like wisprflow.ai. */
export function DotGridPage({
  children,
  className,
  showDotGrid = false,
}: {
  children: React.ReactNode;
  className?: string;
  showDotGrid?: boolean;
}) {
  return (
    <div
      className={cn(
        'marketing-scope relative min-h-screen overflow-x-clip bg-[var(--color-paper)] font-sans text-[var(--color-ink)]',
        className,
      )}
    >
      {showDotGrid ? <DotGridLayer /> : null}
      <div className="relative">{children}</div>
    </div>
  );
}

/** Auth split-panel right column — Bruno portrait on warm cream, with soft glow accents. */
export function AuthPanelBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative hidden overflow-hidden bg-[var(--color-cream-2)] lg:block',
        className,
      )}
    >
      <Image
        src="/planevo_login_hero.png"
        alt="Bruno, your Planevo companion"
        fill
        priority
        className="object-cover object-center"
        sizes="50vw"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/5 to-transparent"
      />
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
