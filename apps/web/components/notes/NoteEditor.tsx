'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BlockNoteBlock } from '@planevo/notes-core';
import { blocksToMarkdown, emptyDocument, markdownToPlainParagraphBlocks } from '@planevo/notes-core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const NoteEditorInner = dynamic(
  () => import('./NoteEditorInner').then((m) => m.NoteEditorInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-(--color-ink-faint)">
        Loading editor…
      </div>
    ),
  }
);

export interface NoteEditorProps {
  noteId: string;
  initialTitle: string;
  initialBlocks: BlockNoteBlock[];
  privacy?: string;
  noteKind?: string;
  canvasCourseName?: string | null;
  linkedAssignmentId?: string | null;
  onSaved?: () => void;
}

export function NoteEditor({
  noteId,
  initialTitle,
  initialBlocks,
  privacy = 'private',
  noteKind,
  canvasCourseName,
  linkedAssignmentId,
  onSaved,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const blocksRef = useRef<BlockNoteBlock[]>(
    initialBlocks.length > 0 ? initialBlocks : emptyDocument()
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorToastRef = useRef(0);
  const dirtyRef = useRef(false);

  const persist = useCallback(async () => {
    if (!dirtyRef.current) return;
    setSaveState('saving');
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          contentJson: blocksRef.current,
          content: blocksToMarkdown(blocksRef.current),
        }),
      });
      if (!response.ok) throw new Error('Save failed');
      dirtyRef.current = false;
      setSaveState('saved');
      onSaved?.();
      setTimeout(() => setSaveState('idle'), 1500);
    } catch {
      const now = Date.now();
      if (now - lastErrorToastRef.current > 30_000) {
        lastErrorToastRef.current = now;
        toast.error('Could not save note');
      }
      setSaveState('idle');
    }
  }, [noteId, title, onSaved]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist();
    }, 2000);
  }, [persist]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleBlocksChange = useCallback(
    (blocks: BlockNoteBlock[]) => {
      blocksRef.current = blocks;
      dirtyRef.current = true;
      scheduleSave();
    },
    [scheduleSave]
  );

  const handleTitleChange = (value: string) => {
    setTitle(value);
    dirtyRef.current = true;
    scheduleSave();
  };

  const handleExport = () => {
    const md = blocksToMarkdown(blocksRef.current);
    const blob = new Blob([`# ${title}\n\n${md}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase() || 'note'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateFlashcards = async () => {
    const response = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, action: 'from-note' }),
    });
    if (!response.ok) {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'GET' });
      const data = await res.json();
      const blocks = (data.note?.content_json as BlockNoteBlock[]) ?? blocksRef.current;
      const { extractFlashcardCandidates } = await import('@planevo/notes-core');
      const cards = extractFlashcardCandidates(blocks);
      if (cards.length === 0) {
        toast.error('Add key terms or study questions first');
        return;
      }
      for (const card of cards) {
        await fetch('/api/flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            noteId,
            blockId: card.blockId,
            front: card.front,
            back: card.back,
          }),
        });
      }
      toast.success(`Created ${cards.length} flashcards`);
      return;
    }
    toast.success('Flashcards created');
  };

  const handleExtractTasks = async () => {
    const { extractTasksFromNoteAction } = await import('@/lib/notes/actions');
    const result = await extractTasksFromNoteAction(noteId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Created ${result.data.taskIds.length} tasks`);
  };

  const initialEditorBlocks = useMemo(
    () => (initialBlocks.length > 0 ? initialBlocks : emptyDocument()),
    [initialBlocks]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-3">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-serif text-4xl tracking-tight text-(--color-ink) outline-none placeholder:text-(--color-ink-faint) md:text-5xl"
          placeholder="Untitled"
        />
        <span
          className={cn(
            'mt-2 inline-flex items-center gap-1.5 text-xs text-(--color-ink-faint)',
            saveState === 'saved' && 'text-sage'
          )}
        >
          {saveState === 'saved' && (
            <span className="size-1.5 rounded-full bg-sage" aria-hidden />
          )}
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Auto-save on'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {privacy === 'private' && (
          <span className="rounded-full bg-honey-soft px-2.5 py-1 text-xs font-medium text-(--color-ink-soft)">
            Private
          </span>
        )}
        {noteKind && (
          <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-medium capitalize text-(--color-ink-soft)">
            {noteKind.replace(/_/g, ' ')}
          </span>
        )}
        {canvasCourseName && (
          <span className="rounded-full bg-note-sky/60 px-2.5 py-1 text-xs font-medium text-(--color-ink)">
            {canvasCourseName}
          </span>
        )}
        {linkedAssignmentId && (
          <span className="rounded-full bg-sage-soft px-2.5 py-1 text-xs font-medium text-(--color-ink-soft)">
            Linked assignment
          </span>
        )}
        <button
          type="button"
          onClick={handleExport}
          className="rounded-full border border-(--color-line-strong) px-2.5 py-1 text-xs font-medium text-(--color-ink-soft) transition-colors hover:bg-cream-2"
        >
          Export MD
        </button>
        <button
          type="button"
          onClick={() => void handleCreateFlashcards()}
          className="rounded-full border border-(--color-line-strong) bg-honey px-2.5 py-1 text-xs font-semibold text-paper transition-colors hover:bg-honey-deep"
        >
          Make flashcards
        </button>
        <button
          type="button"
          onClick={() => void handleExtractTasks()}
          className="rounded-full border border-(--color-line-strong) px-2.5 py-1 text-xs font-medium text-(--color-ink-soft) transition-colors hover:bg-cream-2"
        >
          Extract tasks
        </button>
      </div>

      <div className="min-h-[420px] rounded-3xl bg-note-cream px-2 py-3 shadow-sm">
        <NoteEditorInner
          initialBlocks={initialEditorBlocks}
          onChange={handleBlocksChange}
        />
      </div>
    </div>
  );
}

export function legacyMarkdownToBlocks(content: string): BlockNoteBlock[] {
  return markdownToPlainParagraphBlocks(content);
}
