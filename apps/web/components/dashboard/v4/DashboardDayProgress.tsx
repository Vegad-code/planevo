'use client';

import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { cn } from '@/lib/utils';
import type { DayCompletionStats } from '@/lib/dashboard/day-progress';

const ARC_LENGTH = 251;

interface DashboardDayProgressProps {
  stats: DayCompletionStats;
}

export function DashboardDayProgress({ stats }: DashboardDayProgressProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const clamped = Math.min(100, Math.max(0, stats.percent));
  const filled = (clamped / 100) * ARC_LENGTH;

  useEffect(() => {
    setReduceMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);

  return (
    <GlassPanel variant="card" className="p-6 flex flex-col items-center justify-between min-h-full">
      <span className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-faint)] mb-4 self-start">
        Overall progress
      </span>

      <div className="relative w-full max-w-[200px] aspect-[2/1] overflow-hidden flex-1 flex items-end justify-center">
        <svg viewBox="0 0 200 110" className="w-full" aria-hidden>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--color-accent-warm)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${ARC_LENGTH}`}
            className={cn(!reduceMotion && 'transition-[stroke-dasharray] duration-700 ease-out')}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-2 text-center">
          <span className="font-serif text-3xl text-[var(--color-ink)]">{clamped}%</span>
          <p className="font-mono text-[10px] text-[var(--color-ink-faint)] uppercase tracking-wide">
            completed
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-[var(--color-ink-faint)] text-center">
        {stats.label}
      </p>
    </GlassPanel>
  );
}
