'use client';

import Link from 'next/link';
import { FolderSimple, Star, Trash } from '@phosphor-icons/react';
import { getNoteAccent, stripMarkdownPreview } from '@planevo/notes-core';
import { cn } from '@/lib/utils';
import { noteAccentClass, type NoteListItem } from '@/lib/notes/ui';

export function NoteCard({
  note,
  notebookKind,
  onOrganize,
  onDelete,
}: {
  note: NoteListItem;
  notebookKind?: string;
  onOrganize: () => void;
  onDelete: () => void;
}) {
  const accent = getNoteAccent(note.id, {
    noteKind: note.note_kind,
    isPinned: note.is_pinned,
    isDaily: note.is_daily,
    notebookKind,
  });
  const preview = stripMarkdownPreview(note.content_markdown);

  return (
    <article
      className={cn(
        'group relative flex min-h-[168px] flex-col rounded-3xl p-4 transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md',
        noteAccentClass(accent)
      )}
    >
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          title="File note"
          onClick={(e) => {
            e.preventDefault();
            onOrganize();
          }}
          className="flex size-8 items-center justify-center rounded-full bg-ink/10 text-(--color-ink) backdrop-blur-sm transition-colors hover:bg-ink/20"
        >
          <FolderSimple size={14} weight="bold" />
        </button>
        <button
          type="button"
          title="Delete note"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="flex size-8 items-center justify-center rounded-full bg-ink/10 text-(--color-ink) backdrop-blur-sm transition-colors hover:bg-rose/20"
        >
          <Trash size={14} weight="bold" />
        </button>
      </div>

      <Link href={`/dashboard/notes/${note.id}`} className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2 pr-16">
          {note.is_pinned && (
            <Star size={14} weight="fill" className="mt-1 shrink-0 text-(--color-ink)" />
          )}
          <h3 className="line-clamp-2 font-semibold leading-snug text-(--color-ink)">
            {note.title || 'Untitled'}
          </h3>
        </div>

        {note.canvas_course_name && (
          <p className="text-xs font-medium text-(--color-ink-soft)">{note.canvas_course_name}</p>
        )}

        {preview ? (
          <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-(--color-ink-soft)">
            {preview}
          </p>
        ) : (
          <p className="flex-1 text-sm italic text-(--color-ink-faint)">Empty note</p>
        )}

        <p className="text-xs text-(--color-ink-faint)">
          {note.note_kind.replace(/_/g, ' ')} ·{' '}
          {new Date(note.updated_at).toLocaleDateString(undefined, {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </Link>
    </article>
  );
}
