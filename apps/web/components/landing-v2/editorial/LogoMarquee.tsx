'use client';

import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoMarqueeProps {
  items: React.ReactNode[];
  className?: string;
}

export function LogoMarquee({ items, className }: LogoMarqueeProps) {
  const reduce = useReducedMotion();
  const doubled = [...items, ...items];

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        className={cn(
          'flex w-max items-center gap-12',
          !reduce && 'animate-[marquee_40s_linear_infinite]',
        )}
      >
        {doubled.map((item, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2 opacity-90">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
