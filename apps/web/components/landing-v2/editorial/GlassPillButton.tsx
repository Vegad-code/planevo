import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GlassPillButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  showArrow?: boolean;
}

export function GlassPillButton({
  href,
  children,
  className,
  showArrow = true,
}: GlassPillButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-paper)]/35 bg-[var(--color-paper)]/8 px-8 py-3.5 text-[16px] font-medium text-[var(--color-paper)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_4px_24px_rgba(0,0,0,0.12)] backdrop-blur-md transition-all hover:border-[var(--color-paper)]/50 hover:bg-[var(--color-paper)]/14 active:scale-[0.99]',
        className,
      )}
    >
      <span>{children}</span>
      {showArrow ? (
        <span
          aria-hidden
          className="transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      ) : null}
    </Link>
  );
}
