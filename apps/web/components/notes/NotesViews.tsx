'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Plus, Trash } from '@phosphor-icons/react';
import { brunoMarkdownComponents } from '@/components/bruno/brunoMarkdownComponents';
import { toast } from 'sonner';

type NoteRow = {
  id: string;
  title: string;
  subject: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export function NotesList() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notes');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load notes');
      setNotes(data.notes ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast.error('Could not delete note');
      return;
    }
    setNotes((prev) => prev.filter((note) => note.id !== id));
    toast.success('Note deleted');
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-settings-text)]">Notes</h1>
          <p className="mt-1 text-sm text-[var(--color-settings-text-muted)]">
            Notes you save from Bruno appear here.
          </p>
        </div>
        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)] px-4 py-2 text-sm font-medium text-[var(--color-settings-text)] hover:bg-[var(--color-settings-card-hover)]"
        >
          <Plus size={16} weight="bold" />
          Ask Bruno
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-settings-text-muted)]">Loading notes…</p>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/50 p-8 text-center">
          <p className="text-sm text-[var(--color-settings-text-muted)]">
            No notes yet. Ask Bruno to make notes, then tap <strong>Save to Notes</strong> in chat.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-stretch gap-2 rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]"
            >
              <Link
                href={`/dashboard/notes/${note.id}`}
                className="flex min-w-0 flex-1 flex-col gap-1 p-4 hover:bg-[var(--color-settings-card-hover)] rounded-2xl transition-colors"
              >
                <p className="truncate font-semibold text-[var(--color-settings-text)]">{note.title}</p>
                {note.subject && (
                  <p className="text-xs uppercase tracking-wide text-[var(--color-settings-text-muted)]">
                    {note.subject}
                  </p>
                )}
                <p className="text-xs text-[var(--color-settings-text-muted)]">
                  Updated {new Date(note.updated_at).toLocaleString()}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                className="m-2 flex items-center justify-center rounded-xl border border-[var(--color-settings-border)] px-3 text-[var(--color-settings-text-muted)] hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
                title="Delete note"
              >
                <Trash size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NoteViewer({ noteId }: { noteId: string }) {
  const [note, setNote] = useState<NoteRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/notes/${noteId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load note');
        setNote(data.note);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not load note');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [noteId]);

  if (loading) {
    return <p className="p-6 text-sm text-[var(--color-settings-text-muted)]">Loading note…</p>;
  }

  if (!note) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--color-settings-text-muted)]">Note not found.</p>
        <Link href="/dashboard/notes" className="mt-2 inline-block text-sm text-[var(--color-settings-brand)]">
          Back to Notes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <Link href="/dashboard/notes" className="text-sm text-[var(--color-settings-text-muted)] hover:text-[var(--color-settings-text)]">
        ← Back to Notes
      </Link>
      <h1 className="text-2xl font-bold text-[var(--color-settings-text)]">{note.title}</h1>
      <div className="rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)] px-5 py-4 bruno-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={brunoMarkdownComponents}
        >
          {note.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
