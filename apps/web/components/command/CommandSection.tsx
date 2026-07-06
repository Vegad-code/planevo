'use client';

import type { CommandBoardSection, ResponsibilityItem } from '@/lib/command/types';
import { CommandItemRow } from './CommandItemRow';
import { SECTION_LABEL } from './format';

/**
 * A board section: a quiet header + a list of dense rows. Sections get
 * progressively tighter/quieter down the page — `Now` carries visual weight,
 * `On My Plate` is a compact list (§26.1 state-dependent hierarchy). Empty
 * sections do not render as scaffolding.
 */
export function CommandSection({
  section,
  items,
  now,
  emphasis,
  selectedId,
  onSelect,
  onToggleDone,
}: {
  section: CommandBoardSection;
  items: ResponsibilityItem[];
  now: Date;
  emphasis: 'lead' | 'normal' | 'quiet';
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleDone: (item: ResponsibilityItem) => void;
}) {
  if (items.length === 0) return null;

  const headerClass =
    emphasis === 'lead'
      ? 'text-[13px] font-semibold text-[var(--color-ink)]'
      : 'text-[12px] font-medium text-[var(--color-ink-soft)]';

  return (
    <section className={emphasis === 'quiet' ? 'mt-6' : 'mt-7'}>
      <div className="mb-1.5 flex items-baseline gap-2 px-2">
        <h2 className={`uppercase tracking-wide ${headerClass}`}>
          {SECTION_LABEL[section]}
        </h2>
        <span className="text-[12px] tabular-nums text-[var(--color-ink-faint)]">
          {items.length}
        </span>
      </div>
      <div className={emphasis === 'quiet' ? 'space-y-0' : 'space-y-0.5'}>
        {items.map((item) => (
          <CommandItemRow
            key={item.id}
            item={item}
            now={now}
            selected={selectedId === item.id}
            onSelect={onSelect}
            onToggleDone={onToggleDone}
          />
        ))}
      </div>
    </section>
  );
}
