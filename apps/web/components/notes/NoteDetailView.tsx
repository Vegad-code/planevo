'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import type { BlockNoteBlock } from '@planevo/notes-core';
import { legacyMarkdownToBlocks, NoteEditor } from '@/components/notes/NoteEditor';
import { BrunoOrganizePrompt } from '@/components/notes/BrunoOrganizePrompt';
import { toast } from 'sonner';
import { restoreNoteRevisionAction } from '@/lib/notes/actions';
import { AssignmentPicker } from '@/components/notes/AssignmentPicker';
import type { Notebook } from '@/lib/notes/ui';

type NoteDetail = {
  id: string;
  title: string;
  subject: string | null;
  content: string;
  content_json: BlockNoteBlock[] | null;
  content_markdown: string | null;
  note_kind: string;
  privacy: string;
  canvas_course_name: string | null;
  linked_assignment_id: string | null;
};

type Revision = { id: string; title: string; created_at: string };

export function NoteDetailView({ noteId }: { noteId: string }) {
  const searchParams = useSearchParams();
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrganize, setShowOrganize] = useState(searchParams.get('organize') === '1');

  const loadNote = useCallback(async () => {
    setLoading(true);
    try {
      const [noteRes, nbRes, revRes] = await Promise.all([
        fetch(`/api/notes/${noteId}`),
        fetch('/api/notebooks'),
        fetch(`/api/notes/${noteId}/revisions`),
      ]);
      const noteData = await noteRes.json();
      const nbData = await nbRes.json();
      const revData = await revRes.json();
      if (!noteRes.ok) throw new Error(noteData.error || 'Failed to load note');
      setNote(noteData.note);
      setNotebooks(nbData.notebooks ?? []);
      setRevisions(revData.revisions ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load note');
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    void loadNote();
  }, [loadNote]);

  const handleRestore = async (revisionId: string) => {
    const result = await restoreNoteRevisionAction(noteId, revisionId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Restored previous version');
    void loadNote();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="h-6 w-32 animate-pulse rounded-full bg-cream-2" />
        <div className="h-12 w-2/3 animate-pulse rounded-xl bg-cream-2" />
        <div className="h-80 animate-pulse rounded-3xl bg-note-cream" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="p-6">
        <p className="text-sm text-(--color-ink-soft)">Note not found.</p>
        <Link
          href="/dashboard/notes"
          className="mt-2 inline-block text-sm font-medium text-honey-deep hover:underline"
        >
          Back to Notes
        </Link>
      </div>
    );
  }

  const blocks =
    note.content_json && note.content_json.length > 0
      ? note.content_json
      : legacyMarkdownToBlocks(note.content_markdown ?? note.content ?? '');

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 lg:p-6">
      <Link
        href="/dashboard/notes"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-(--color-ink-soft) transition-colors hover:text-(--color-ink)"
      >
        <ArrowLeft size={16} />
        Back to Notes
      </Link>

      <NoteEditor
        noteId={note.id}
        initialTitle={note.title}
        initialBlocks={blocks}
        privacy={note.privacy}
        noteKind={note.note_kind}
        canvasCourseName={note.canvas_course_name}
        linkedAssignmentId={note.linked_assignment_id}
      />

      <AssignmentPicker noteId={note.id} onLinked={() => void loadNote()} />

      {revisions.length > 0 && (
        <div className="rounded-3xl bg-paper p-5 shadow-sm">
          <h3 className="font-serif text-lg text-(--color-ink)">History</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {revisions.map((rev) => (
              <li
                key={rev.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-2 text-sm"
              >
                <span className="text-(--color-ink-soft)">
                  {rev.title} · {new Date(rev.created_at).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => void handleRestore(rev.id)}
                  className="shrink-0 text-xs font-medium text-honey-deep hover:underline"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showOrganize && (
        <BrunoOrganizePrompt
          noteId={note.id}
          notebooks={notebooks}
          onClose={() => setShowOrganize(false)}
          onOrganized={() => {
            setShowOrganize(false);
            void loadNote();
          }}
        />
      )}
    </div>
  );
}
