'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface NowIndicatorProps {
  dayStartHour: number;
  hourHeight?: number;
}

/**
 * The "now" line — a horizontal accent-colored line with a pulsing dot
 * that shows the current time on the vertical timeline.
 * Updates every 60 seconds.
 */
export default function NowIndicator({ dayStartHour, hourHeight = 72 }: NowIndicatorProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const hours = now.getHours() + now.getMinutes() / 60;
  const top = (hours - dayStartHour) * hourHeight;

  // Don't render if outside visible range
  if (top < 0) return null;

  const timeLabel = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      {/* Time label */}
      <span className="absolute right-full mr-2 -translate-y-1/2 text-[10px] font-mono font-bold text-[var(--color-honey-deep)] whitespace-nowrap">
        {timeLabel}
      </span>

      {/* Pulsing dot on the rail */}
      <motion.div
        className="absolute -translate-y-1/2 rounded-full"
        style={{
          left: '0px',
          width: '10px',
          height: '10px',
          backgroundColor: 'var(--color-honey-deep)',
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* The line */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-[2px] rounded-full"
        style={{
          left: '14px',
          right: '0',
          backgroundColor: 'var(--color-honey-deep)',
          opacity: 0.6,
        }}
      />
    </div>
  );
}
