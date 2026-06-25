'use client';

import { useState } from 'react';
import { getNoteAccent } from '@planevo/notes-core';
import { toast } from 'sonner';
import { organizeNoteAction } from '@/lib/notes/actions';
import { cn } from '@/lib/utils';
import { noteAccentClass, type Notebook } from '@/lib/notes/ui';

export function BrunoOrganizePrompt({
  noteId,
  notebooks,
  onClose,
  onOrganized,
}: {
  noteId: string;
  notebooks: Notebook[];
  onClose: () => void;
  onOrganized: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handlePick = async (notebook: Notebook) => {
    setSaving(true);
    try {
      const result = await organizeNoteAction({
        noteId,
        notebookId: notebook.id,
        noteKind: notebook.kind === 'course' ? 'class_note' : undefined,
        canvasCourseName: notebook.canvas_course_name,
      });
      if (!result.success) throw new Error(result.error);
      toast.success(`Filed under ${notebook.name}`);
      onOrganized();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not organize note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-paper p-6 shadow-xl">
        <h3 className="font-serif text-xl text-(--color-ink)">File this note?</h3>
        <p className="mt-1 text-sm text-(--color-ink-soft)">
          Pick a notebook or keep it in your inbox.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {notebooks.map((nb) => {
            const accent = getNoteAccent(nb.id, { notebookKind: nb.kind });
            return (
              <button
                key={nb.id}
                type="button"
                disabled={saving}
                onClick={() => void handlePick(nb)}
                className="flex items-center gap-3 rounded-2xl border border-(--color-line) bg-cream px-4 py-3 text-left text-sm transition-colors hover:bg-cream-2 disabled:opacity-60"
              >
                <span
                  className={cn('size-3 shrink-0 rounded-full', noteAccentClass(accent))}
                  aria-hidden
                />
                <span className="font-medium text-(--color-ink)">{nb.name}</span>
                {nb.kind === 'course' && (
                  <span className="ml-auto text-xs text-(--color-ink-faint)">Class</span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-2xl py-2.5 text-sm text-(--color-ink-soft) transition-colors hover:bg-cream"
        >
          Keep in Inbox
        </button>
      </div>
    </div>
  );
}
