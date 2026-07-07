'use client';

import { cn } from '@/lib/utils';
import { PHONE_WIDTH } from './heroTimelineLayout';

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
  showStatusBar?: boolean;
}

export function PhoneFrame({ children, className, showStatusBar = true }: PhoneFrameProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-paper)] shadow-[0_12px_40px_rgba(47,90,174,0.12)]',
        className,
      )}
      style={{ width: PHONE_WIDTH }}
    >
      {showStatusBar ? (
        <div
          className="flex h-6 shrink-0 items-center justify-center border-b border-[var(--color-line)]/40"
          aria-hidden
        >
          <div className="h-1 w-12 rounded-full bg-[var(--color-line)]/60" />
        </div>
      ) : null}
      {children}
    </div>
  );
}
