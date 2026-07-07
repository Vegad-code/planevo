'use client';

import { useEffect, useState } from 'react';
import { FEATURE_TAB_IDS, type FeatureTabId } from '@/lib/marketing/nav';
import { cn } from '@/lib/utils';

const TAB_LABELS: Record<FeatureTabId, string> = {
  command: 'Command',
  calendar: 'Calendar',
  tasks: 'Tasks',
  notes: 'Notes',
};

export function FeatureTabNav() {
  const [active, setActive] = useState<FeatureTabId>('command');

  useEffect(() => {
    const ids = [...FEATURE_TAB_IDS];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const id = visible[0].target.id as FeatureTabId;
          if (ids.includes(id)) setActive(id);
        }
      },
      { rootMargin: '-35% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: FeatureTabId) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className="sticky top-[44px] z-40 flex justify-center px-4 pb-3 pt-1 sm:top-[48px]">
      <nav
        role="tablist"
        aria-label="Feature areas"
        className="glass-panel inline-flex items-center gap-0.5 rounded-full p-0.5 shadow-[0_4px_24px_rgba(20,20,20,0.06)]"
      >
        {FEATURE_TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => scrollTo(id)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-medium transition-all sm:px-3.5 sm:text-[12px]',
              active === id
                ? 'bg-[var(--color-paper)]/95 text-[var(--color-ink)] shadow-[0_1px_3px_rgba(20,20,20,0.08)]'
                : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
            )}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </nav>
    </div>
  );
}
