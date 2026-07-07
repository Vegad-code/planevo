'use client';

import {
  Children,
  isValidElement,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useReducedMotion, useScroll } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollConnectLine } from './ScrollConnectLine';
import { SnakeStreamProgressProvider } from './snakeStreamContext';

/**
 * Three full-viewport feature panels that stack on scroll — each sticky sibling
 * slides up and covers the one below (no scale/zoom on the outgoing panel).
 */
export function FeatureStackScroll({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const items = Children.toArray(children).filter(isValidElement) as ReactElement[];

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  if (reduce) {
    return <div className="relative">{children}</div>;
  }

  return (
    <SnakeStreamProgressProvider progress={scrollYProgress}>
      <div ref={containerRef} className="relative">
        <ScrollConnectLine />

        {items.map((child, index) => (
          <div
            key={child.key ?? `feature-stack-${index}`}
            className={cn(
              'relative lg:sticky lg:top-0 lg:h-svh lg:min-h-svh lg:overflow-hidden',
              index > 0 && 'lg:shadow-[0_-32px_80px_rgba(0,0,0,0.5)]',
            )}
            style={{ zIndex: 10 + index }}
          >
            {child}
          </div>
        ))}
      </div>
    </SnakeStreamProgressProvider>
  );
}

/** @deprecated Use FeatureStackScroll — kept for existing imports. */
export function FeatureConnectTrack({ children }: { children: ReactNode }) {
  return <FeatureStackScroll>{children}</FeatureStackScroll>;
}
