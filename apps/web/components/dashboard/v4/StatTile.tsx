import { type ReactNode } from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  trend?: string;
  className?: string;
}

export function StatTile({ label, value, sublabel, icon, trend, className }: StatTileProps) {
  return (
    <GlassPanel variant="card" className={cn('p-5 flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--color-ink-faint)]">
          {label}
        </span>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-accent-warm)]/15 text-[var(--color-accent-warm)]">
            {icon}
          </span>
        )}
      </div>
      <div>
        <div className="font-serif text-3xl text-[var(--color-ink)] leading-none">{value}</div>
        {sublabel && (
          <p className="text-xs text-[var(--color-ink-faint)] mt-1.5">{sublabel}</p>
        )}
        {trend && (
          <p className="text-xs text-[var(--color-accent-warm)] mt-2 font-medium">{trend}</p>
        )}
      </div>
    </GlassPanel>
  );
}
