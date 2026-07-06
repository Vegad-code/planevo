'use client';

import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BrunoEventDemo } from './BrunoEventDemo';
import { BrunoReflectionDemo } from './BrunoReflectionDemo';

const TABS = [
  { id: 'action', label: 'In action' },
  { id: 'reflection', label: 'Reflect with Bruno' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const CAPTIONS: Record<TabId, string> = {
  action: 'Propose \u00b7 Approve \u00b7 Done \u2014 you stay in control',
  reflection: 'Thoughtful \u00b7 Grounded \u00b7 No platitudes',
};

/**
 * Tabbed Bruno demos — action (calendar propose/approve) and reflection chat.
 */
export function BrunoDemoTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('action');
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Bruno demo scenarios"
        className="mx-auto flex gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-1"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'rounded-full px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors',
              activeTab === id
                ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink-soft)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface-raised)]/90 p-4 backdrop-blur-sm sm:p-6"
      >
        <div key={`${activeTab}-${reduceMotion ? 'static' : 'anim'}`} className="mx-auto max-w-2xl">
          {activeTab === 'action' ? <BrunoEventDemo /> : <BrunoReflectionDemo />}
        </div>
      </div>

      <p className="text-center font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-soft)]">
        {CAPTIONS[activeTab]}
      </p>
    </div>
  );
}
