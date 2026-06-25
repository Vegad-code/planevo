'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  inferTitleFromMarkdown,
  markdownToStructuredBlocks,
  BRUNO_SECTION_MAP,
  blocksToMarkdown,
} from '@planevo/notes-core';
import type { BrunoTruncatedNotice } from '@/lib/bruno/types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function BrunoNoteActions({
  content,
  conversationId,
  truncated,
  onContinue,
}: {
  content: string;
  conversationId?: string | null;
  truncated?: BrunoTruncatedNotice | null;
  onContinue?: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const shouldShow =
    Boolean(truncated) || content.trim().length >= 1800;

  if (!shouldShow || !content.trim()) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const contentJson = markdownToStructuredBlocks(content, BRUNO_SECTION_MAP);
      const title = inferTitleFromMarkdown(content, 'Notes');
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: blocksToMarkdown(contentJson),
          contentJson,
          noteKind: 'bruno_generated',
          isBrunoContent: true,
          ...(conversationId && UUID_RE.test(conversationId)
            ? { sourceConversationId: conversationId }
            : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save note');
      }
      toast.success('Saved to Notes');
      if (result.note?.id) {
        router.push(`/dashboard/notes/${result.note.id}?organize=1`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {truncated?.canContinue && onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full border border-[var(--color-settings-border)] bg-[var(--color-settings-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-settings-text)] hover:bg-[var(--color-settings-card-hover)]"
        >
          Continue
        </button>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-full border border-[var(--color-settings-brand)]/40 bg-[var(--color-settings-brand)]/15 px-3 py-1.5 text-xs font-medium text-[var(--color-settings-text)] hover:bg-[var(--color-settings-brand)]/25 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save to Notes'}
      </button>
    </div>
  );
}
