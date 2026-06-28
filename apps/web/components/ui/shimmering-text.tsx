'use client';

import { useMemo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ShimmeringTextProps {
  text: string;
  duration?: number;
  className?: string;
  spread?: number;
  color?: string;
  shimmerColor?: string;
}

export function ShimmeringText({
  text,
  duration = 1.4,
  className,
  spread = 3.5,
  color,
  shimmerColor,
}: ShimmeringTextProps) {
  const dynamicSpread = useMemo(() => text.length * spread, [text, spread]);

  return (
    <motion.span
      className={cn(
        'relative inline-block bg-clip-text text-transparent',
        'bg-[length:300%_100%,auto] [background-repeat:no-repeat,padding-box]',
        className
      )}
      style={
        {
          '--spread': `${dynamicSpread}px`,
          '--base-color': color ?? 'var(--color-settings-text)',
          '--shimmer-color': shimmerColor ?? 'var(--shimmer-highlight)',
          backgroundImage:
            'linear-gradient(90deg, transparent calc(50% - var(--spread)), var(--shimmer-color) 50%, transparent calc(50% + var(--spread))), linear-gradient(var(--base-color), var(--base-color))',
        } as CSSProperties
      }
      initial={{ backgroundPosition: '150% center' }}
      animate={{ backgroundPosition: '-50% center' }}
      transition={{
        duration,
        ease: 'linear',
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {text}
    </motion.span>
  );
}
