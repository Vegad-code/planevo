'use client';

import type { DailyMetric } from '@/lib/stats';
import { GlassPanel } from '@/components/ui/glass-panel';

interface DashboardProductivityChartProps {
  metrics: DailyMetric[];
}

export function DashboardProductivityChart({ metrics }: DashboardProductivityChartProps) {
  const sorted = [...metrics].reverse().slice(-7);
  const maxFocus = Math.max(...sorted.map((m) => m.focus_time_seconds / 60), 60);

  const points = sorted.map((m, i) => {
    const x = sorted.length <= 1 ? 50 : (i / (sorted.length - 1)) * 100;
    const y = 100 - (m.focus_time_seconds / 60 / maxFocus) * 80;
    return `${x},${y}`;
  });

  const areaPath =
    points.length > 0
      ? `M0,100 L${points.map((p) => p.replace(',', ' ')).join(' L')} L100,100 Z`
      : 'M0,100 L100,100 Z';

  return (
    <GlassPanel variant="card" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-serif text-lg text-[var(--color-ink)]">Productivity</h3>
          <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">Focus time over the last 7 days</p>
        </div>
        <span className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-ink-faint)]">
          This week
        </span>
      </div>
      <div className="relative h-40 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="productivityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent-warm)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--color-accent-depth)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#productivityFill)" />
          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="var(--color-accent-warm)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              points={points.join(' ')}
            />
          )}
        </svg>
      </div>
    </GlassPanel>
  );
}
