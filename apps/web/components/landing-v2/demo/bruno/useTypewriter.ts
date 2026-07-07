'use client';

import { useEffect, useState } from 'react';

/**
 * Typewriter via requestAnimationFrame — batches 2 chars per frame per playbook.
 */
export function useTypewriter(text: string, active: boolean): string {
  const [count, setCount] = useState(active ? 0 : text.length);

  useEffect(() => {
    if (!active) {
      setCount(text.length);
      return;
    }

    setCount(0);
    let frame = 0;
    let raf = 0;

    const tick = () => {
      frame += 1;
      const next = Math.min(text.length, frame * 2);
      setCount(next);
      if (next < text.length) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [text, active]);

  return text.slice(0, count);
}
