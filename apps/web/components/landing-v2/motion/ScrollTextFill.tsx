'use client';

import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { cn } from '@/lib/utils';

/** Viewport heights the user must scroll while the quote stays pinned. */
const SCROLL_TRACK_VH = 120;

function FillWord({
  word,
  progress,
  range,
  inverted = false,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  inverted?: boolean;
}) {
  const fillWidth = useTransform(progress, range, ['0%', '100%']);
  const label = `${word}\u00a0`;
  const faint = inverted ? 'text-[var(--color-paper)]/55' : 'text-[var(--color-ink-faint)]';
  const filled = inverted ? 'text-[var(--color-paper)]' : 'text-[var(--color-ink)]';

  return (
    <span className="relative inline-block align-baseline leading-inherit">
      <span className="invisible inline-block whitespace-pre" aria-hidden>
        {label}
      </span>
      <span className={cn('pointer-events-none absolute left-0 top-0 bottom-0 whitespace-pre', faint)}>
        {label}
      </span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 bottom-0 overflow-hidden"
        style={{ width: fillWidth }}
      >
        <span className={cn('inline-block whitespace-pre', filled)}>{label}</span>
      </motion.span>
    </span>
  );
}

/**
 * Attio-style pinned scroll quote — stays full-viewport while the user scrolls a
 * tall track; words reveal left-to-right per word. Content below only appears
 * after the track is fully scrolled.
 */
export function ScrollTextFill({
  quote,
  attribution,
  role,
  className,
  inverted = false,
}: {
  quote: string;
  attribution: string;
  role?: string;
  className?: string;
  inverted?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  const words = quote.split(/\s+/).filter(Boolean);
  const fillSpan = 0.88;
  const step = fillSpan / words.length;

  const attributionOpacity = useTransform(scrollYProgress, [0.78, 0.95], [0, 1]);
  const attributionY = useTransform(scrollYProgress, [0.78, 0.95], [16, 0]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1], [0.65, 0]);

  if (reduce) {
    return (
      <section
        className={cn(
          'relative px-6 py-24 sm:py-32',
          className,
        )}
      >
        <div className="mx-auto max-w-5xl text-center">
          <blockquote className={cn(
            'font-serif text-[32px] leading-[1.15] tracking-tight sm:text-[48px]',
            inverted ? 'text-[var(--color-paper)]' : 'text-[var(--color-ink)]',
          )}>
            &ldquo;{quote}&rdquo;
          </blockquote>
          <footer className="mt-10 flex flex-col items-center gap-1">
            <p className={cn(
              'font-sans text-[16px] font-medium',
              inverted ? 'text-[var(--color-paper)]/75' : 'text-[var(--color-ink-soft)]',
            )}>
              {attribution}
            </p>
            {role && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-soft)]">
                {role}
              </p>
            )}
          </footer>
        </div>
      </section>
    );
  }

  return (
    <div
      ref={trackRef}
      className={cn('relative', className)}
      style={{ height: `${SCROLL_TRACK_VH}vh` }}
    >
      <section className="sticky top-0 z-20 flex h-svh min-h-svh flex-col items-center justify-center px-6">
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center">
          <blockquote className="font-serif text-[34px] leading-[1.14] tracking-[-0.02em] sm:text-[52px] lg:text-[64px] xl:text-[76px]">
            <span className={inverted ? 'text-[var(--color-paper)]/55' : 'text-[var(--color-ink-faint)]'}>&ldquo;</span>
            <span className="sr-only">{quote}</span>
            <span aria-hidden>
            {words.map((word, index) => {
              const start = index * step;
              const end = Math.min(fillSpan, start + step * 1.25);
              return (
                <FillWord
                  key={`${word}-${index}`}
                  word={word}
                  progress={scrollYProgress}
                  range={[start, end]}
                  inverted={inverted}
                />
              );
            })}
            </span>
            <span className={inverted ? 'text-[var(--color-paper)]/55' : 'text-[var(--color-ink-faint)]'}>&rdquo;</span>
          </blockquote>

          <motion.footer
            style={{ opacity: attributionOpacity, y: attributionY }}
            className="mt-12 flex flex-col items-center gap-2 sm:mt-14"
          >
            <p className={cn(
              'font-sans text-[17px] font-medium sm:text-[19px]',
              inverted ? 'text-[var(--color-paper)]/75' : 'text-[var(--color-ink-soft)]',
            )}>
              {attribution}
            </p>
            {role && (
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                {role}
              </p>
            )}
          </motion.footer>
        </div>

        <motion.p
          style={{ opacity: hintOpacity }}
          aria-hidden
          className={cn(
            'absolute bottom-12 font-mono text-[10px] uppercase tracking-[0.2em]',
            inverted ? 'text-[var(--color-paper)]/70' : 'text-[var(--color-ink-soft)]',
          )}
        >
          Scroll to read
        </motion.p>

        <div
          aria-hidden
          className="absolute bottom-6 left-1/2 h-1 w-20 -translate-x-1/2 overflow-hidden rounded-full bg-[var(--color-line)]"
        >
          <motion.div
            style={{ scaleX: scrollYProgress }}
            className={cn(
              'h-full w-full origin-left rounded-full',
              inverted ? 'bg-[var(--color-paper)]/35' : 'bg-[var(--color-ink)]/40',
            )}
          />
        </div>
      </section>
    </div>
  );
}
