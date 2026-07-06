'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type CursorPoint = { x: number; y: number };

/**
 * Scripted pointer for landing demos — moves to targets and plays a click ripple.
 */
export function DemoCursor({
  point,
  visible = true,
  clicking = false,
  className,
}: {
  point: CursorPoint;
  visible?: boolean;
  clicking?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce || !visible) return null;

  return (
    <motion.div
      aria-hidden
      className={cn('pointer-events-none absolute left-0 top-0 z-50', className)}
      animate={{ x: point.x, y: point.y, opacity: visible ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.6 }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="drop-shadow-md">
        <path
          d="M6.5 3.2L22.8 14.1C23.6 14.6 23.2 15.9 22.2 15.9H16.5L18.4 23.5C18.7 24.6 17.3 25.2 16.6 24.3L4.8 9.8C4.2 9.1 4.7 8 5.6 8H11.3L6.5 3.2Z"
          fill="var(--color-ink)"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      {clicking && (
        <motion.span
          initial={{ scale: 0.4, opacity: 0.7 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="absolute left-2 top-2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-ink)]"
        />
      )}
    </motion.div>
  );
}

/** Center of a demo-target element relative to the stage container. */
export function targetCenter(
  container: HTMLElement | null,
  selector: string,
): CursorPoint | null {
  if (!container) return null;
  const target = container.querySelector<HTMLElement>(selector);
  if (!target) return null;
  const c = container.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  return {
    x: t.left - c.left + t.width / 2 - 4,
    y: t.top - c.top + t.height / 2 - 2,
  };
}
