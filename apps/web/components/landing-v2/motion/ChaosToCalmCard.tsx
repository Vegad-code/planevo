'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HERO_CHAOS_SNIPPETS } from '@/components/landing-v2/demo/fixtures';
import { cn } from '@/lib/utils';

const MESSY_HOLD_MS = 2200;
const CLEAN_HOLD_MS = 2800;

const layoutSpring = { type: 'spring' as const, stiffness: 260, damping: 30 };

/** Per-word spring — bouncy up/down settle like Wispr Flow. */
const wordSpring = { type: 'spring' as const, stiffness: 520, damping: 22, mass: 0.7 };

const phraseVariants = {
  enter: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

const wordVariants = {
  initial: { opacity: 0, y: 16 },
  enter: { opacity: 1, y: 0, transition: wordSpring },
  exit: { opacity: 0, y: -14, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

/** Deterministic initial queue — must match on server and client for hydration. */
const INITIAL_QUEUE = HERO_CHAOS_SNIPPETS.map((_, i) => i);

/** Fisher-Yates shuffle; ensures the first item differs from `avoid` (no repeat across passes). */
function shuffledQueue(avoid?: number): number[] {
  const order = HERO_CHAOS_SNIPPETS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (avoid !== undefined && order[0] === avoid && order.length > 1) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

export function ChaosToCalmCard() {
  const reduce = useReducedMotion();
  const queueRef = useRef<number[]>(INITIAL_QUEUE);
  const [index, setIndex] = useState(0);
  const [showClean, setShowClean] = useState(false);
  const [ready, setReady] = useState(false);

  const snippet = HERO_CHAOS_SNIPPETS[index];
  const text = showClean ? snippet.clean : snippet.messy;
  const words = text.split(' ');
  const phaseKey = `${index}-${showClean ? 'clean' : 'messy'}`;

  useEffect(() => {
    const queue = shuffledQueue();
    queueRef.current = queue;
    setIndex(queue[0]);
    setReady(true);
  }, []);

  useEffect(() => {
    if (reduce || !ready) return;

    const delay = showClean ? CLEAN_HOLD_MS : MESSY_HOLD_MS;
    const id = window.setTimeout(() => {
      if (showClean) {
        setShowClean(false);
        queueRef.current.shift();
        if (queueRef.current.length === 0) {
          queueRef.current = shuffledQueue(index);
        }
        setIndex(queueRef.current[0]);
      } else {
        setShowClean(true);
      }
    }, delay);

    return () => window.clearTimeout(id);
  }, [showClean, reduce, index, ready]);

  if (reduce) {
    return (
      <div className="mx-auto mt-8 flex justify-center px-2">
        <div className="rounded-full border border-[var(--color-ocean)]/25 bg-[var(--color-ocean-soft)]/55 px-5 py-3 shadow-sm">
          <p className="text-center text-[13px] font-medium leading-snug text-[var(--color-ink)] sm:text-[14px]">
            {HERO_CHAOS_SNIPPETS[0].clean}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 flex w-full justify-center px-2" aria-live="polite">
      <span className="sr-only">{snippet.clean}</span>
      <motion.div
        layout
        transition={layoutSpring}
        className={cn(
          'flex w-full max-w-lg items-center justify-center rounded-full border px-6 py-4 shadow-sm',
          showClean
            ? 'border-[var(--color-ocean)]/30 bg-[var(--color-ocean-soft)]/60'
            : 'border-[var(--color-line-strong)] bg-[var(--color-paper)] shadow-[0_2px_12px_rgba(20,20,20,0.06)]',
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={phaseKey}
            layout="position"
            variants={phraseVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className={cn(
              'flex flex-wrap items-center justify-center gap-x-[0.28em] gap-y-0.5 text-center text-[15px] leading-snug sm:text-[16px]',
              showClean
                ? 'font-medium text-[var(--color-ink)]'
                : 'text-[var(--color-ink-soft)]',
            )}
          >
            {words.map((word, i) => (
              <motion.span
                key={`${phaseKey}-${i}`}
                variants={wordVariants}
                className="inline-block"
              >
                {word}
              </motion.span>
            ))}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
