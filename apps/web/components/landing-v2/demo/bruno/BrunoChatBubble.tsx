'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BrunoChatBubbleProps {
  variant: 'user' | 'assistant';
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  layoutId?: string;
}

export function BrunoChatBubble({ variant, children, className, animate = true, layoutId }: BrunoChatBubbleProps) {
  const base =
    variant === 'user'
      ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--color-ink)] text-white'
      : 'rounded-2xl rounded-tl-md bg-[var(--color-surface-muted)] text-[var(--color-ink-soft)]';

  if (!animate) {
    return (
      <div className={cn(base, 'px-3.5 py-2.5 text-[13px] leading-snug', className)}>{children}</div>
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      initial={layoutId ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(base, 'px-3.5 py-2.5 text-[13px] leading-snug', className)}
    >
      {children}
    </motion.div>
  );
}
