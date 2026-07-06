'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Drives a looping step counter (0 → steps-1 → 0 …) that only advances while
 * the returned ref is in view. Reduced motion pins to the final step so the
 * demo shows its resolved state without animating.
 */
export function useInViewStep(steps: number, intervalMs = 1400) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [inView, setInView] = useState(false);
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
      return;
    }
    if (!inView) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % steps);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [reduce, inView, steps, intervalMs]);

  return { ref, step, reduce };
}
