'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from '@phosphor-icons/react';
import { GlassPanel } from '@/components/ui/glass-panel';
import type { ExtractedResponsibility } from '@/lib/command/types';
import { formatDue, TYPE_LABEL } from './format';

export interface PreviewDraft extends ExtractedResponsibility {
  accepted: boolean;
}

/**
 * Preview panel — dominates the screen while open; everything else dims (§26.1).
 * This is a genuinely separate plane, so glass is allowed. Confidence /
 * needs-review UI lives ONLY here and in Unsorted (§26.1 metadata budget). Copy
 * from §38 ("Review what Planevo found" / "Add to Command").
 */
export function CommandPreviewPanel({
  summary,
  drafts,
  now,
  submitting,
  onChange,
  onConfirm,
  onDiscard,
}: {
  summary: string;
  drafts: PreviewDraft[];
  now: Date;
  submitting: boolean;
  onChange: (index: number, patch: Partial<PreviewDraft>) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const reduce = useReducedMotion();
  const acceptedCount = drafts.filter((d) => d.accepted).length;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <GlassPanel variant="chrome" className="p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="font-[var(--font-serif)] text-[20px] text-[var(--color-ink)]">
            Review what Planevo found
          </h2>
          {summary && (
            <p className="mt-0.5 text-[13px] text-[var(--color-ink-soft)]">{summary}</p>
          )}
        </div>

        <ul className="divide-y divide-[var(--glass-border)]">
          {drafts.map((draft, index) => (
            <PreviewRow
              key={index}
              draft={draft}
              now={now}
              onToggle={() => onChange(index, { accepted: !draft.accepted })}
              onTitle={(title) => onChange(index, { title })}
            />
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="text-[13px] text-[var(--color-ink-faint)] hover:text-[var(--color-ink-soft)]"
          >
            Discard
          </button>
          <button
            type="button"
            data-demo-target="add-to-command"
            onClick={onConfirm}
            disabled={submitting || acceptedCount === 0}
            className="rounded-full bg-[var(--color-accent-warm)] px-4 py-2 text-[14px] font-medium text-white transition-opacity disabled:opacity-40"
          >
            {submitting
              ? 'Adding…'
              : `Add to Command${acceptedCount > 0 ? ` (${acceptedCount})` : ''}`}
          </button>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

function PreviewRow({
  draft,
  now,
  onToggle,
  onTitle,
}: {
  draft: PreviewDraft;
  now: Date;
  onToggle: () => void;
  onTitle: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const due = formatDue(draft.dueAt, now);
  const typeLabel = TYPE_LABEL[draft.type];

  return (
    <li className="flex items-start gap-3 py-2.5">
      <button
        type="button"
        aria-label={draft.accepted ? 'Exclude item' : 'Include item'}
        onClick={onToggle}
        className={[
          'mt-0.5 flex h-[18px] w-[18px] flex-none items-center justify-center rounded-md border transition-colors',
          draft.accepted
            ? 'border-[var(--color-accent-warm)] bg-[var(--color-accent-warm)] text-white'
            : 'border-[var(--color-ink-faint)] text-transparent',
        ].join(' ')}
      >
        <Check weight="bold" size={11} />
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => onTitle(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
            className="w-full rounded border border-[var(--glass-border)] bg-[var(--color-surface-raised)] px-1.5 py-1 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent-warm)]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={[
              'text-left text-[14px] leading-snug',
              draft.accepted ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-faint)] line-through',
            ].join(' ')}
          >
            {draft.title}
          </button>
        )}

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-ink-faint)]">
          {typeLabel && <span className="uppercase tracking-wide">{typeLabel}</span>}
          {due && <span>{due}</span>}
          {draft.needsReview && (
            <span className="text-[var(--color-accent-warm)]">
              {draft.reviewReason ?? 'Needs a date'}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
