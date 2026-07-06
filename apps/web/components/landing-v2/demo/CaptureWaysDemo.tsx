'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Keyboard, ClipboardText, Microphone, ArrowDown, Check } from '@phosphor-icons/react';

type Way = 'type' | 'paste' | 'say';

const WAYS: { id: Way; label: string; icon: typeof Keyboard }[] = [
  { id: 'type', label: 'Type', icon: Keyboard },
  { id: 'paste', label: 'Paste', icon: ClipboardText },
  { id: 'say', label: 'Say', icon: Microphone },
];

const OUTPUT: Record<Way, { title: string; meta: string }> = {
  type: { title: 'Bio lab report', meta: 'Assignment · Due Friday' },
  paste: { title: 'Algebra quiz', meta: 'Assessment · Tomorrow' },
  say: { title: 'Soccer practice', meta: 'Practice · Every day · 4:00 PM' },
};

const TYPE_TEXT = 'bio lab report due friday';

function useTypewriter(text: string, active: boolean, speedMs = 45): string {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    setCount(0);
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, active, speedMs]);
  return text.slice(0, count);
}

function InputViz({ way }: { way: Way }) {
  const typed = useTypewriter(TYPE_TEXT, way === 'type');

  if (way === 'type') {
    return (
      <p className="text-left font-sans text-[15px] leading-relaxed text-[var(--color-ink)]">
        {typed}
        <span className="typing-cursor" />
      </p>
    );
  }

  if (way === 'paste') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="rounded-lg border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-muted)] p-3 text-left"
      >
        <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-soft)]">
          Pasted from Canvas
        </p>
        <p className="font-sans text-[13px] leading-snug text-[var(--color-ink-soft)]">
          MATH 101 — Quiz 4 · Due Feb 15, 11:59 PM · Chapters 3–4
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex h-10 items-end justify-center gap-1.5">
      {Array.from({ length: 13 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-[var(--color-honey)]"
          initial={{ height: 6 }}
          animate={{ height: [6, 8 + ((i * 7) % 26), 6] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: (i % 5) * 0.08,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Capture-section demo — deliberately different from the hero's full product
 * demo. Cycles Type / Paste / Say, each morphing into the same clean
 * responsibility card, to show the "three ways in" idea.
 */
export function CaptureWaysDemo() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || !inView) return;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % WAYS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduce, inView]);

  const way = WAYS[index].id;
  const out = OUTPUT[way];

  return (
    <div
      ref={ref}
      inert
      className="mx-auto w-full max-w-md rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-5 shadow-xl"
    >
      {/* Mode tabs */}
      <div className="relative flex rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-1">
        {WAYS.map((w, i) => {
          const Icon = w.icon;
          const active = i === index;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                active ? 'text-white' : 'text-[var(--color-ink-soft)]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="capture-way-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-[var(--color-ink)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <Icon size={13} weight="bold" />
              {w.label}
            </button>
          );
        })}
      </div>

      {/* Input visualization */}
      <div className="mt-4 flex min-h-[68px] items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-4 py-3">
        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={way}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <InputViz way={way} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Morph arrow */}
      <div className="my-2 flex justify-center text-[var(--color-ink-soft)]">
        <ArrowDown size={16} weight="bold" />
      </div>

      {/* Clean output card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={way}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 shadow-sm"
        >
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--color-forest-soft)] text-[var(--color-forest)]">
            <Check size={12} weight="bold" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[14px] font-medium text-[var(--color-ink)]">
              {out.title}
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-soft)]">
              {out.meta}
            </span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
