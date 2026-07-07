'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type CursorPoint = { x: number; y: number };

/**
 * Hotspot of the pointer — tip of the arrow at the motion.div origin.
 * Matches DemoPointerSvg viewBox tip at (1, 1).
 */
const CURSOR_TIP = { x: 1, y: 1 };

export type DemoTargetAnchor = 'center' | 'caret' | 'text-start';

const TRAVEL_EASE = [0.22, 1, 0.36, 1] as const;

function DemoPointerSvg() {
  return (
    <svg
      width="22"
      height="26"
      viewBox="0 0 22 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block"
      aria-hidden
    >
      {/* Soft drop shadow */}
      <path
        d="M2 2.2V20.8L7.1 16.4L9.8 23.2L12.1 22.2L9.6 15.6H16.2L2 2.2Z"
        fill="rgba(20,20,20,0.22)"
        transform="translate(0.8 1)"
      />
      {/* macOS-style arrow: white fill, crisp dark outline */}
      <path
        d="M1 1V19.6L6.1 15.2L8.8 22L11.1 21L8.6 14.4H15.2L1 1Z"
        fill="white"
        stroke="#141414"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className={cn('pointer-events-none absolute left-0 top-0 z-50 will-change-transform', className)}
      initial={false}
      animate={{
        x: point.x,
        y: point.y,
        opacity: visible ? 1 : 0,
        scale: clicking ? 0.92 : 1,
      }}
      transition={{
        x: { duration: 0.6, ease: TRAVEL_EASE },
        y: { duration: 0.6, ease: TRAVEL_EASE },
        opacity: { duration: 0.2, ease: 'easeOut' },
        scale: { duration: 0.12, ease: 'easeOut' },
      }}
    >
      <div className="relative">
        <DemoPointerSvg />
        {clicking && (
          <motion.span
            initial={{ scale: 0.35, opacity: 0.55 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute left-1 top-1 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#141414]/30 bg-[#141414]/8"
          />
        )}
      </div>
    </motion.div>
  );
}

/** Position the cursor tip on a demo target relative to the stage container. */
export function measureDemoTarget(
  container: HTMLElement | null,
  selector: string,
  anchor: DemoTargetAnchor = 'center',
): CursorPoint | null {
  if (!container) return null;
  const target = container.querySelector<HTMLElement>(selector);
  if (!target) return null;
  const c = container.getBoundingClientRect();
  const t = target.getBoundingClientRect();

  let tipX: number;
  let tipY: number;

  switch (anchor) {
    case 'center':
      tipX = t.left + t.width / 2;
      tipY = t.top + t.height / 2;
      break;
    case 'caret':
      tipX = t.right;
      tipY = t.top + t.height / 2;
      break;
    case 'text-start':
      tipX = t.left + 8;
      tipY = t.top + 20;
      break;
    default: {
      const exhaustive: never = anchor;
      throw new Error(`Unhandled demo target anchor: ${exhaustive}`);
    }
  }

  return {
    x: tipX - c.left - CURSOR_TIP.x,
    y: tipY - c.top - CURSOR_TIP.y,
  };
}

/** @deprecated Use measureDemoTarget — kept for older demos. */
export function targetCenter(
  container: HTMLElement | null,
  selector: string,
): CursorPoint | null {
  return measureDemoTarget(container, selector, 'center');
}
