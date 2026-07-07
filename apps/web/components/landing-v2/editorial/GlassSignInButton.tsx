import Link from 'next/link';
import { cn } from '@/lib/utils';

interface GlassSignInButtonProps {
  href: string;
  className?: string;
  onClick?: () => void;
}

export function GlassSignInButton({ href, className, onClick }: GlassSignInButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'glass-panel inline-flex items-center justify-center rounded-lg px-4 py-1.5',
        'text-[13px] font-medium text-[var(--color-ink)]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_8px_rgba(20,20,20,0.04)]',
        'transition-[box-shadow,transform] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_4px_12px_rgba(20,20,20,0.06)]',
        'active:scale-[0.98]',
        className,
      )}
    >
      Sign in
    </Link>
  );
}
