'use client';

import { useState } from 'react';
import { Check, DotsThree } from '@phosphor-icons/react';
import type { ResponsibilityItem } from '@/lib/command/types';
import { formatDue, isPastDue, SOURCE_GLYPH, TYPE_LABEL } from './format';

/**
 * A responsibility renders as a dense typographic ROW, not a card (§26.1).
 * At rest it shows at most two signals: due date (right-aligned, muted) and a
 * small source glyph. Actions appear on hover/selection only. No box, border,
 * shadow, or badge stack.
 */
export function CommandItemRow({
  item,
  now,
  selected,
  onSelect,
  onToggleDone,
}: {
  item: ResponsibilityItem;
  now: Date;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleDone: (item: ResponsibilityItem) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const due = formatDue(item.dueAt, now);
  const pastDue = isPastDue(item.dueAt, now) && item.status !== 'done';
  const done = item.status === 'done';
  const sourceGlyph = SOURCE_GLYPH[item.sourceType];
  const typeLabel = TYPE_LABEL[item.type];
  const showActions = hovered || selected;

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => onSelect(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item.id);
        }
      }}
      className={[
        'group flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 cursor-pointer transition-colors duration-150',
        selected
          ? 'bg-[var(--color-surface-muted)]'
          : 'hover:bg-[var(--color-surface-muted)]/60',
      ].join(' ')}
    >
      {/* Complete toggle — appears on hover/selection; sage on done. */}
      <button
        type="button"
        aria-label={done ? 'Mark not done' : 'Mark done'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(item);
        }}
        className={[
          'flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border transition-all duration-150',
          done
            ? 'border-[var(--color-sage,#6B8B69)] bg-[var(--color-sage,#6B8B69)] text-white'
            : showActions
              ? 'border-[var(--color-ink-faint)] text-transparent hover:border-[var(--color-sage,#6B8B69)]'
              : 'border-[var(--glass-border)] text-transparent',
        ].join(' ')}
      >
        <Check weight="bold" size={11} />
      </button>

      {/* Title — real text hierarchy. */}
      <span
        className={[
          'min-w-0 flex-1 truncate text-[15px] leading-snug',
          done
            ? 'text-[var(--color-ink-faint)] line-through'
            : 'text-[var(--color-ink)]',
        ].join(' ')}
      >
        {item.title}
      </span>

      {/* Type label — only when it adds information (never for unknown). */}
      {typeLabel && !done && (
        <span className="hidden flex-none text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)] sm:inline">
          {typeLabel}
        </span>
      )}

      {/* Source glyph — muted, only when not manual. */}
      {sourceGlyph && (
        <span className="flex-none text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          {sourceGlyph}
        </span>
      )}

      {/* Due date — right-aligned, muted; a warm accent when past due (no badge). */}
      {due && (
        <span
          className={[
            'flex-none text-[13px] tabular-nums',
            pastDue
              ? 'text-[var(--color-accent-warm)]'
              : 'text-[var(--color-ink-faint)]',
          ].join(' ')}
        >
          {due}
        </span>
      )}

      {/* Overflow affordance — hover/selection only. */}
      <button
        type="button"
        aria-label="More actions"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id);
        }}
        className={[
          'flex-none rounded-md p-0.5 text-[var(--color-ink-faint)] transition-opacity duration-150',
          showActions ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        <DotsThree weight="bold" size={16} />
      </button>
    </div>
  );
}
