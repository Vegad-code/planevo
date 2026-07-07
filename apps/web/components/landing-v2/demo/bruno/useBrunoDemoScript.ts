'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface UseBrunoDemoScriptOptions {
  steps: number;
  intervalMs?: number;
  /** When false, parent controls step via external trigger */
  autoPlay?: boolean;
}

/**
 * Play-once demo script: advances while in view, stops at final step, supports Replay.
 */
export function useBrunoDemoScript({
  steps,
  intervalMs = 1500,
  autoPlay = true,
}: UseBrunoDemoScriptOptions) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [inView, setInView] = useState(false);
  const [finished, setFinished] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduce) {
      setStep(steps - 1);
      setFinished(true);
      return;
    }
    setStep(0);
    setFinished(false);
  }, [reduce, steps, playKey]);

  useEffect(() => {
    if (!autoPlay || reduce || !inView || finished) return;

    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= steps - 1) {
          setFinished(true);
          return s;
        }
        return s + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [autoPlay, reduce, inView, finished, steps, intervalMs, playKey]);

  const replay = useCallback(() => {
    setPlayKey((k) => k + 1);
  }, []);

  return { ref, step, finished, replay, reduce: Boolean(reduce) };
}
