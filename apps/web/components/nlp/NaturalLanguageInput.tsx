'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ParsedNaturalInput } from '@planevo/nlp-core';
import { parseNaturalInput } from '@/lib/calendar/parseEventInput';
import { ParseChips } from '@/components/nlp/ParseChips';
import {
  NLP_EMPTY_HINT,
  NLP_PLACEHOLDER,
  getGhostExample,
} from '@/lib/nlp/copy';

const KIND_COLORS: Record<string, string> = {
  datetime: 'bg-amber-200/60 text-amber-950',
  duration: 'bg-emerald-200/60 text-emerald-950',
  priority: 'bg-violet-200/60 text-violet-950',
  tag: 'bg-slate-200/60 text-slate-800',
  recurrence: 'bg-sky-200/60 text-sky-950',
  dueCue: 'bg-orange-200/60 text-orange-950',
  backlog: 'bg-stone-200/60 text-stone-800',
};

export interface NaturalLanguageInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  refDate?: Date;
  enabled?: boolean;
  smartSchedulingEnabled?: boolean;
  showChips?: boolean;
  showHint?: boolean;
  hint?: string;
  ghostExample?: boolean;
  autoFocus?: boolean;
  id?: string;
  onDismissEntity?: (entityIndex: number) => void;
}

function buildHighlightedSegments(
  text: string,
  parsed: ParsedNaturalInput | null
): { text: string; kind?: string }[] {
  if (!parsed || parsed.entities.length === 0) {
    return [{ text }];
  }

  const spans = [...parsed.entities]
    .map((entity, index) => ({ ...entity, index }))
    .sort((a, b) => a.span.start - b.span.start);

  const segments: { text: string; kind?: string }[] = [];
  let cursor = 0;

  for (const entity of spans) {
    if (entity.span.start > cursor) {
      segments.push({ text: text.slice(cursor, entity.span.start) });
    }
    segments.push({
      text: text.slice(entity.span.start, entity.span.end),
      kind: entity.kind,
    });
    cursor = entity.span.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

export function NaturalLanguageInput({
  value,
  onChange,
  placeholder = NLP_PLACEHOLDER,
  className,
  inputClassName,
  refDate = new Date(),
  enabled = true,
  smartSchedulingEnabled = true,
  showChips = true,
  showHint = false,
  hint = NLP_EMPTY_HINT,
  ghostExample = false,
  autoFocus,
  id,
}: NaturalLanguageInputProps) {
  const isEmpty = value.trim().length === 0;

  const parsed = useMemo(
    () =>
      enabled && value.trim()
        ? parseNaturalInput(value, refDate, { smartSchedulingEnabled })
        : null,
    [value, refDate, enabled, smartSchedulingEnabled]
  );

  const segments = useMemo(
    () => buildHighlightedSegments(value, parsed),
    [value, parsed]
  );

  const ghostText = useMemo(
    () => (ghostExample ? getGhostExample() : null),
    [ghostExample]
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative">
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 whitespace-pre-wrap break-words text-lg font-medium text-transparent',
            inputClassName
          )}
        >
          {segments.map((segment, index) => (
            <span
              key={`${segment.kind ?? 'plain'}-${index}`}
              className={cn(segment.kind && KIND_COLORS[segment.kind])}
            >
              {segment.text}
            </span>
          ))}
        </div>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          className={cn(
            'relative w-full bg-transparent border-none outline-none text-lg font-medium text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] caret-[var(--color-honey)]',
            inputClassName
          )}
        />
      </div>
      {showChips && parsed && parsed.chips.length > 0 && (
        <ParseChips
          chips={parsed.chips.map((label) => ({
            label,
            confidence: parsed.confidence,
          }))}
        />
      )}
      {showHint && isEmpty && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-[var(--color-ink-faint)]">{hint}</p>
          {ghostText && (
            <p className="text-xs italic text-[var(--color-ink-faint)]/80">
              {ghostText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
