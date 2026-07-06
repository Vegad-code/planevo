'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;

function pct(min: number): string {
  return `${((min - DAY_START) / (DAY_END - DAY_START)) * 100}%`;
}

interface FixedEvent {
  label: string;
  start: number;
  end: number;
  tone: 'blue' | 'rose';
}

interface GapBlock {
  label: string;
  duration: string;
  start: number;
  end: number;
}

const FIXED_EVENTS: FixedEvent[] = [
  { label: 'AP Bio · class', start: 10 * 60, end: 11 * 60 + 30, tone: 'blue' },
  { label: 'Soccer practice', start: 16 * 60, end: 17 * 60, tone: 'rose' },
];

const GAP_BLOCKS: GapBlock[] = [
  { label: 'Bio lab report', duration: '90m', start: 11 * 60 + 45, end: 13 * 60 + 15 },
  { label: 'Algebra review', duration: '45m', start: 13 * 60 + 30, end: 14 * 60 + 15 },
  { label: 'Ask teacher', duration: '15m', start: 15 * 60, end: 15 * 60 + 15 },
];

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function hourLabel(h: number): string {
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

const TONE_CLASS: Record<FixedEvent['tone'], string> = {
  blue: 'bg-[var(--color-ocean-soft)] border-[var(--color-ocean)]/40 text-[var(--color-charcoal)]',
  rose: 'bg-[var(--color-markup)]/20 border-[var(--color-markup)]/50 text-[var(--color-ink)]',
};

/**
 * The moat visual: fixed calendar events render immediately, then honey blocks
 * spring into the real gaps between them — "planned into your real free time".
 *
 * `trigger="mount"` animates on mount (hero demo state); `trigger="inView"`
 * animates on scroll (feature section).
 */
export function PlanMyDayTimeline({
  trigger,
  className,
}: {
  trigger: 'mount' | 'inView';
  className?: string;
}) {
  const reduce = useReducedMotion();

  const blockAnimation = (i: number) =>
    reduce
      ? {}
      : trigger === 'mount'
        ? {
            initial: { scaleY: 0, opacity: 0 },
            animate: { scaleY: 1, opacity: 1 },
            transition: {
              delay: 0.4 + i * 0.35,
              type: 'spring' as const,
              stiffness: 260,
              damping: 24,
            },
          }
        : {
            initial: { scaleY: 0, opacity: 0 },
            whileInView: { scaleY: 1, opacity: 1 },
            viewport: { once: true, margin: '-60px' },
            transition: {
              delay: 0.4 + i * 0.35,
              type: 'spring' as const,
              stiffness: 260,
              damping: 24,
            },
          };

  const captionAnimation = reduce
    ? {}
    : trigger === 'mount'
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { delay: 0.4 + GAP_BLOCKS.length * 0.35 + 0.3 },
        }
      : {
          initial: { opacity: 0 },
          whileInView: { opacity: 1 },
          viewport: { once: true, margin: '-60px' },
          transition: { delay: 0.4 + GAP_BLOCKS.length * 0.35 + 0.3 },
        };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="relative h-[340px]">
        {/* Hour gridlines */}
        {HOURS.map((h) => (
          <div
            key={h}
            aria-hidden
            className="absolute inset-x-0 flex items-center gap-2"
            style={{ top: pct(h * 60) }}
          >
            <span className="w-10 flex-none text-right font-mono text-[9px] text-[var(--color-ink-soft)]">
              {hourLabel(h)}
            </span>
            <span className="h-px flex-1 bg-[var(--color-line)]" />
          </div>
        ))}

        {/* Event lane */}
        <div className="absolute inset-y-0 left-14 right-1">
          {FIXED_EVENTS.map((event) => (
            <div
              key={event.label}
              className={cn(
                'absolute inset-x-2 flex items-center gap-1.5 overflow-hidden rounded-lg border px-2.5',
                TONE_CLASS[event.tone],
              )}
              style={{ top: pct(event.start), height: pct(event.end - event.start + DAY_START) }}
            >
              <span className="truncate text-[11px] font-semibold">{event.label}</span>
            </div>
          ))}

          {GAP_BLOCKS.map((block, i) => (
            <motion.div
              key={block.label}
              {...blockAnimation(i)}
              style={{
                top: pct(block.start),
                height: pct(block.end - block.start + DAY_START),
                transformOrigin: 'top',
              }}
              className="absolute inset-x-2 flex items-center justify-between gap-1.5 overflow-hidden rounded-lg border border-[var(--color-honey)]/40 bg-[var(--color-honey-soft)] px-2.5"
            >
              <span className="truncate text-[11px] font-semibold text-[var(--color-honey-deep)]">
                {block.label}
              </span>
              <span className="flex-none font-mono text-[9px] text-[var(--color-honey-deep)]/70">
                {block.duration}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.p
        {...captionAnimation}
        className="text-center font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage)]"
      >
        3 responsibilities placed in real gaps
      </motion.p>
    </div>
  );
}
