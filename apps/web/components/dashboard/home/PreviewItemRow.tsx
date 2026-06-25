'use client';

import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { PreviewItem, PreviewItemKind } from '@/lib/dashboard/home-preview';

const KIND_ACCENT: Record<PreviewItemKind, string> = {
  task: 'bg-(--color-honey)',
  block: 'bg-(--color-blue)',
  canvas: 'bg-(--color-rose)',
  event: 'bg-(--color-blue)',
  work: 'bg-(--color-sage)',
};

interface PreviewItemRowProps {
  item: PreviewItem;
  metaLabel?: string;
  showCheckbox?: boolean;
  isActive?: boolean;
  onToggleComplete?: () => void;
  onPress?: () => void;
}

export function PreviewItemRow({
  item,
  metaLabel,
  showCheckbox = false,
  isActive = false,
  onToggleComplete,
  onPress,
}: PreviewItemRowProps) {
  const accent = KIND_ACCENT[item.kind];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-2xl border transition-colors',
        isActive
          ? 'border-(--color-honey) bg-(--color-honey-soft)/30'
          : 'border-line hover:bg-(--color-cream-2)/50'
      )}
    >
      {showCheckbox ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete?.();
          }}
          aria-label="Mark task complete"
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong hover:border-(--color-sage) hover:bg-(--color-sage-soft) transition-colors cursor-pointer"
        >
          <Check className="size-3 text-transparent" />
        </button>
      ) : (
        <span className={cn('mt-2 size-1.5 shrink-0 rounded-full', accent)} />
      )}

      <button
        type="button"
        onClick={onPress}
        className="flex-1 min-w-0 text-left cursor-pointer bg-transparent border-none p-0"
      >
        <div className="text-[14px] font-medium text-(--color-ink) truncate leading-tight">
          {item.title}
        </div>
        {(metaLabel || item.subtitle) && (
          <div className="font-mono text-[10px] text-(--color-ink-soft) mt-1 tracking-wide uppercase">
            {metaLabel || item.subtitle}
          </div>
        )}
      </button>
    </div>
  );
}
