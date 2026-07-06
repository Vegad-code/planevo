import Link from 'next/link';
import { cn } from '@/lib/utils';

interface OceanPillButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  showArrow?: boolean;
  onClick?: () => void;
}

export function OceanPillButton({
  href,
  children,
  className,
  showArrow = true,
  onClick,
}: OceanPillButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full bg-[var(--color-ocean)] px-6 py-3 text-[15px] font-semibold text-[var(--color-charcoal)] transition-transform hover:scale-[1.02] active:scale-[0.99]',
        className,
      )}
    >
      <span>{children}</span>
      {showArrow ? (
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-charcoal)]/10 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-px"
        >
          →
        </span>
      ) : null}
    </Link>
  );
}
