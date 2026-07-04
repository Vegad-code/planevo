'use client';

import { format } from 'date-fns';
import DOMPurify from 'isomorphic-dompurify';
import {
  ArrowSquareOut,
  CalendarBlank,
  Clock,
  Sparkle,
} from '@phosphor-icons/react';
import type { SourceListItem } from '@/lib/plan/source-items';
import { SOURCE_PROVIDER_LABELS } from '@/lib/plan/source-items';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface SourceItemDetailSheetProps {
  item: SourceListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAskBruno: (item: SourceListItem) => void;
}

function formatDetailTime(item: SourceListItem): string | null {
  if (item.startAt) {
    const start = new Date(item.startAt);
    const startStr = format(start, 'EEEE, MMM d, h:mm a');
    if (!item.endAt) return startStr;
    const end = new Date(item.endAt);
    return `${startStr} - ${format(end, 'h:mm a')}`;
  }
  if (item.dueAt) {
    return `Due ${format(new Date(item.dueAt), 'EEEE, MMM d, h:mm a')}`;
  }
  return null;
}

function isHtmlDescription(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

export function SourceItemDetailSheet({
  item,
  open,
  onOpenChange,
  onAskBruno,
}: SourceItemDetailSheetProps) {
  if (!item) return null;

  const providerLabel = SOURCE_PROVIDER_LABELS[item.provider];
  const timeLabel = formatDetailTime(item);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-line bg-paper text-ink sm:max-w-md [&>button>svg]:text-ink"
      >
        <SheetHeader className="text-left gap-3 pb-4 border-b border-line">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
            {providerLabel}
            {item.meta ? `, ${item.meta}` : ''}
          </div>
          <SheetTitle className="pr-8 text-2xl font-semibold leading-tight text-ink">
            {item.title}
          </SheetTitle>
          {timeLabel && (
            <SheetDescription asChild>
              <div className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
                {item.startAt ? (
                  <CalendarBlank weight="bold" className="w-4 h-4 shrink-0" />
                ) : (
                  <Clock weight="bold" className="w-4 h-4 shrink-0" />
                )}
                {timeLabel}
              </div>
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex flex-col gap-6 py-6">
          {item.description && (
            <section className="flex flex-col gap-2">
              <h3 className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
                Details
              </h3>
              {isHtmlDescription(item.description) ? (
                <div
                  className="prose prose-sm max-w-none rounded-2xl border border-line bg-[var(--color-surface-muted)] p-4 prose-p:text-[var(--color-ink-soft)] prose-headings:font-semibold prose-a:text-[var(--color-honey-deep)]"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(item.description, {
                      USE_PROFILES: { html: true },
                    }),
                  }}
                />
              ) : (
                <p className="m-0 whitespace-pre-wrap rounded-2xl border border-line bg-[var(--color-surface-muted)] p-4 text-sm leading-6 text-[var(--color-ink-soft)]">
                  {item.description}
                </p>
              )}
            </section>
          )}

          <div className="flex flex-col gap-2 mt-auto">
            <button
              type="button"
              onClick={() => onAskBruno(item)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              <Sparkle weight="fill" className="mr-2 h-4 w-4" />
              Ask Bruno
            </button>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line-strong bg-transparent px-5 text-sm font-semibold text-ink transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                <ArrowSquareOut weight="bold" className="mr-2 h-4 w-4" />
                Open in {providerLabel}
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
