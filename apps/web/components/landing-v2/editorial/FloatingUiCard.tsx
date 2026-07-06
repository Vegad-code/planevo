'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface FloatingUiCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'dark' | 'cream';
  rotate?: number;
  parallax?: boolean;
}

export function FloatingUiCard({
  children,
  className,
  variant = 'dark',
  rotate = 0,
  parallax = false,
}: FloatingUiCardProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, parallax && !reduce ? -12 : 0]);

  const shellClass =
    variant === 'dark'
      ? 'bg-[var(--color-charcoal)] shadow-[0_24px_80px_rgba(20,20,20,0.18)]'
      : 'bg-[var(--color-paper)] shadow-[0_24px_64px_rgba(20,20,20,0.08)]';

  return (
    <motion.div
      ref={ref}
      style={{ y, rotate: reduce ? 0 : rotate }}
      className={cn('rounded-[2rem] p-4 sm:rounded-[2rem] sm:p-6', shellClass, className)}
    >
      {children}
    </motion.div>
  );
}
