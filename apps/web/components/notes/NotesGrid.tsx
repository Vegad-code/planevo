'use client';

import { NotePencil, Plus } from '@phosphor-icons/react';
import { NoteCard } from './NoteCard';
import type { NoteListItem, Notebook } from '@/lib/notes/ui';

export function NotesGrid({
  notes,
  notebooks,
  loading,
  onQuickCapture,
  onOrganize,
  onDelete,
}: {
  notes: NoteListItem[];
  notebooks: Notebook[];
  loading: boolean;
  onQuickCapture: () => void;
  onOrganize: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}) {
  const notebookKindById = new Map(notebooks.map((nb) => [nb.id, nb.kind]));

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[168px] animate-pulse rounded-3xl bg-cream-2"
            style={{ animationDelay: `${i * 75}ms` }}
          />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 lg:p-12">
        <div className="relative flex h-32 w-40 items-end justify-center">
          <div className="absolute bottom-0 left-0 h-24 w-28 rotate-[-6deg] rounded-2xl bg-note-sky shadow-sm" />
          <div className="absolute bottom-2 left-8 h-24 w-28 rotate-[4deg] rounded-2xl bg-note-yellow shadow-sm" />
          <div className="relative z-10 flex h-28 w-32 items-center justify-center rounded-2xl bg-note-cream shadow-md">
            <NotePencil size={32} className="text-(--color-ink-faint)" />
          </div>
        </div>
        <div className="max-w-sm text-center">
          <p className="font-serif text-2xl text-(--color-ink)">Capture a thought</p>
          <p className="mt-2 text-sm text-(--color-ink-soft)">
            Start a quick note or ask Bruno to build study guides from your classes.
          </p>
        </div>
        <button
          type="button"
          onClick={onQuickCapture}
          className="inline-flex items-center gap-2 rounded-full bg-honey px-5 py-2.5 text-sm font-semibold text-paper hover:bg-honey-deep"
        >
          <Plus size={16} weight="bold" />
          Quick note
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:p-6">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          notebookKind={
            note.notebook_id ? notebookKindById.get(note.notebook_id) : undefined
          }
          onOrganize={() => onOrganize(note.id)}
          onDelete={() => onDelete(note.id)}
        />
      ))}
    </div>
  );
}
