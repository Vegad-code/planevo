'use client';

import { format, isToday, isTomorrow } from 'date-fns';
import { CaretRight, Clock } from '@phosphor-icons/react';
import type { SourceListItem } from '@/lib/plan/source-items';
import { cn } from '@/lib/utils';

interface SourceListProps {
  items: SourceListItem[];
  onSelect: (item: SourceListItem) => void;
}

function formatDueLabel(iso: string): string {
  const date = new Date(iso);
  const time = format(date, 'h:mm a');
  if (isToday(date)) return `Today, ${time}`;
  if (isTomorrow(date)) return `Tomorrow, ${time}`;
  return format(date, 'MMM d, h:mm a');
}

function formatEventRange(item: SourceListItem): string | null {
  if (!item.startAt) return null;
  const start = new Date(item.startAt);
  const startLabel = format(start, isToday(start) ? 'h:mm a' : 'MMM d, h:mm a');
  if (!item.endAt) return startLabel;
  const end = new Date(item.endAt);
  return `${startLabel} - ${format(end, 'h:mm a')}`;
}

export function SourceList({ items, onSelect }: SourceListProps) {
  if (items.length === 0) return null;

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((item) => {
        const timeLabel = item.startAt
          ? formatEventRange(item)
          : item.dueAt
            ? formatDueLabel(item.dueAt)
            : null;

        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={cn(
                'group min-h-[72px] w-full rounded-2xl border border-line bg-[var(--color-surface-raised)] px-4 py-3.5 text-left',
                'transition-colors hover:border-[var(--color-honey-deep)]/40 hover:bg-[var(--color-surface-muted)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
                    {item.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {item.meta && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
                        {item.meta}
                      </span>
                    )}
                    {timeLabel && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-ink-soft)]">
                        <Clock weight="bold" className="w-3 h-3 shrink-0" />
                        {timeLabel}
                      </span>
                    )}
                  </div>
                </div>
                <CaretRight
                  weight="bold"
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-ink-soft)] transition-colors group-hover:text-ink"
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
