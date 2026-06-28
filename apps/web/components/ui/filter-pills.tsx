'use client';

import { cn } from '@/lib/utils';

export interface FilterPillOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  options: FilterPillOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterPills({ options, activeId, onChange, className }: FilterPillsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = activeId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all border',
              isActive
                ? 'bg-[var(--color-accent-warm)] text-[var(--color-accent-cream)] border-[var(--color-accent-warm)] shadow-sm'
                : 'glass-card text-[var(--color-ink-soft)] hover:border-[var(--color-accent-warm)]/30',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn('ml-1.5 opacity-70', isActive && 'opacity-90')}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
