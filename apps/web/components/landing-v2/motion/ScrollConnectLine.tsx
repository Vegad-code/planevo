'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

const NODE_IDS = ['capture', 'board', 'plan'] as const;

/**
 * Vertical connect line that grows with scroll through the three deep feature rows.
 */
export function ScrollConnectLine({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Array<{ id: string; top: number }>>([]);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start 0.1', 'end 0.9'],
  });

  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function measure() {
      const t = trackRef.current;
      if (!t) return;
      const trackTop = t.getBoundingClientRect().top + window.scrollY;
      const trackHeight = t.offsetHeight;
      const next = NODE_IDS.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, top: 0 };
        const rect = el.getBoundingClientRect();
        const center = rect.top + window.scrollY + rect.height / 2 - trackTop;
        return { id, top: Math.min(trackHeight, Math.max(0, center)) };
      });
      setNodes(next);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    for (const id of NODE_IDS) {
      const el = document.getElementById(id);
      if (el) ro.observe(el);
    }
    return () => ro.disconnect();
  }, []);

  if (reduce) return null;

  return (
    <div
      ref={trackRef}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 hidden lg:block', className)}
    >
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--color-line)]" />
      <motion.div
        style={{ scaleY: lineScale }}
        className="absolute left-1/2 top-0 h-full w-px origin-top -translate-x-1/2 bg-[var(--color-ink)]/25"
      />
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          style={{ top: node.top }}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="block h-2.5 w-2.5 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] shadow-sm" />
        </motion.div>
      ))}
    </div>
  );
}

/** Wraps feature sections so the connect line can track their scroll span. */
export function FeatureConnectTrack({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <ScrollConnectLine />
      {children}
    </div>
  );
}
