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
import { Button } from '@/components/ui/button';

interface SourceItemDetailSheetProps {
  item: SourceListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAskBruno: (item: SourceListItem) => void;
}

function formatDetailTime(item: SourceListItem): string | null {
  if (item.startAt) {
    const start = new Date(item.startAt);
    const startStr = format(start, 'EEEE, MMM d · h:mm a');
    if (!item.endAt) return startStr;
    const end = new Date(item.endAt);
    return `${startStr} – ${format(end, 'h:mm a')}`;
  }
  if (item.dueAt) {
    return `Due ${format(new Date(item.dueAt), 'EEEE, MMM d · h:mm a')}`;
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
        className="w-full sm:max-w-md bg-paper border-line overflow-y-auto"
      >
        <SheetHeader className="text-left gap-3 pb-4 border-b border-line">
          <div className="font-mono text-[10px] tracking-[0.16em] text-(--color-ink-soft) uppercase">
            {providerLabel}
            {item.meta ? ` · ${item.meta}` : ''}
          </div>
          <SheetTitle className="font-serif text-2xl text-ink leading-tight pr-8">
            {item.title}
          </SheetTitle>
          {timeLabel && (
            <SheetDescription asChild>
              <div className="flex items-center gap-2 font-sans text-sm text-(--color-ink-soft)">
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
              <h3 className="font-mono text-[10px] tracking-[0.14em] text-(--color-ink-soft) uppercase m-0">
                Details
              </h3>
              {isHtmlDescription(item.description) ? (
                <div
                  className="prose prose-sm max-w-none prose-p:text-(--color-ink-soft) prose-headings:font-serif prose-a:text-(--color-honey-deep) rounded-xl border border-line bg-(--color-honey)/5 p-4"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(item.description, {
                      USE_PROFILES: { html: true },
                    }),
                  }}
                />
              ) : (
                <p className="font-sans text-sm text-(--color-ink-soft) leading-relaxed m-0 whitespace-pre-wrap rounded-xl border border-line bg-(--color-honey)/5 p-4">
                  {item.description}
                </p>
              )}
            </section>
          )}

          <div className="flex flex-col gap-2 mt-auto">
            <Button
              type="button"
              onClick={() => onAskBruno(item)}
              className="w-full rounded-full bg-ink text-paper hover:bg-ink/90"
            >
              <Sparkle weight="fill" className="w-4 h-4 mr-2" />
              Ask Bruno
            </Button>
            {item.url && (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-line"
                asChild
              >
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOut weight="bold" className="w-4 h-4 mr-2" />
                  Open in {providerLabel}
                </a>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
