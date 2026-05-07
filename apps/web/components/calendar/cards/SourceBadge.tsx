'use client';

import { getSourceColor, getSourceLabel } from '@/lib/calendar/layoutEngine';
import type { CalendarSource } from '@/types/calendar';

interface SourceBadgeProps {
  source: CalendarSource;
  size?: 'sm' | 'md';
}

export default function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const color = getSourceColor(source);
  const label = getSourceLabel(source);

  return (
    <span
      className={`
        inline-flex items-center font-bold uppercase tracking-wider rounded-full
        ${size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}
      `}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}
