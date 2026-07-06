'use client';

import { cn } from '@/lib/utils';

export type DemoState = 'dump' | 'preview' | 'board' | 'plan';

export const DEMO_STATES: Array<{ id: DemoState; label: string }> = [
  { id: 'dump', label: 'Dump it' },
  { id: 'preview', label: 'Review' },
  { id: 'board', label: 'Calm board' },
  { id: 'plan', label: 'Plan my day' },
];

export function DemoStateDots({
  active,
  onJump,
  states = DEMO_STATES,
}: {
  active: DemoState;
  onJump: (state: DemoState) => void;
  states?: Array<{ id: DemoState; label: string }>;
}) {
  return (
    <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Demo steps">
      {states.map((state) => {
        const isActive = state.id === active;
        return (
          <button
            key={state.id}
            type="button"
            role="tab"
            data-demo-target={`demo-dot-${state.id}`}
            aria-selected={isActive}
            aria-label={state.label}
            onClick={() => onJump(state.id)}
            className={cn(
              'group flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors',
              isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)]',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                isActive ? 'w-5 bg-[var(--color-ink)]' : 'w-1.5 bg-[var(--color-ink)]/20 group-hover:bg-[var(--color-ink)]/35',
              )}
            />
            <span className="hidden font-mono text-[10px] uppercase tracking-wider sm:inline">
              {state.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
