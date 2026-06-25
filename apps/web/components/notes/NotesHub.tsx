'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from '@phosphor-icons/react';
import { listSystemTemplates } from '@planevo/notes-core';
import { toast } from 'sonner';
import { BrunoOrganizePrompt } from './BrunoOrganizePrompt';
import { NotesGrid } from './NotesGrid';
import { NotesPageHeader } from './NotesPageHeader';
import { NotesSidebar } from './NotesSidebar';
import type { NoteListItem, Notebook } from '@/lib/notes/ui';

export function NotesHub() {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [organizeNoteId, setOrganizeNoteId] = useState<string | null>(null);
  const templates = listSystemTemplates();

  const loadNotebooks = useCallback(async () => {
    const response = await fetch('/api/notebooks');
    const data = await response.json();
    if (response.ok) setNotebooks(data.notebooks ?? []);
  }, []);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedNotebookId) params.set('notebookId', selectedNotebookId);
      if (searchQuery.trim()) {
        const searchRes = await fetch(`/api/notes/search?query=${encodeURIComponent(searchQuery)}`);
        const searchData = await searchRes.json();
        if (searchRes.ok) {
          setNotes(searchData.notes ?? []);
          return;
        }
      }
      const response = await fetch(`/api/notes?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load notes');
      setNotes(data.notes ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load notes');
    } finally {
      setLoading(false);
    }
  }, [selectedNotebookId, searchQuery]);

  useEffect(() => {
    void loadNotebooks();
  }, [loadNotebooks]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const handleQuickCapture = async () => {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Quick note',
        noteKind: 'quick_capture',
        content: '',
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error || 'Could not create note');
      return;
    }
    router.push(`/dashboard/notes/${data.note.id}?organize=1`);
  };

  const handleDailyNote = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Daily — ${today}`,
        noteKind: 'daily',
        isDaily: true,
        dailyDate: today,
        content: '',
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error || 'Could not open daily note');
      return;
    }
    router.push(`/dashboard/notes/${data.note.id}`);
  };

  const handleTemplate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: template.name,
        noteKind: template.noteKind,
        contentJson: template.blocks,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error || 'Could not create note');
      return;
    }
    setShowTemplates(false);
    router.push(`/dashboard/notes/${data.note.id}`);
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast.error('Could not delete note');
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success('Note deleted');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        void handleQuickCapture();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <NotesSidebar
        notebooks={notebooks}
        selectedNotebookId={selectedNotebookId}
        showTemplates={showTemplates}
        templates={templates}
        onSelectNotebook={setSelectedNotebookId}
        onQuickCapture={() => void handleQuickCapture()}
        onDailyNote={() => void handleDailyNote()}
        onToggleTemplates={() => setShowTemplates((v) => !v)}
        onTemplate={(id) => void handleTemplate(id)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <NotesPageHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <NotesGrid
          notes={notes}
          notebooks={notebooks}
          loading={loading}
          onQuickCapture={() => void handleQuickCapture()}
          onOrganize={setOrganizeNoteId}
          onDelete={(id) => void handleDelete(id)}
        />
      </main>

      <button
        type="button"
        onClick={() => void handleQuickCapture()}
        className="fixed right-6 bottom-6 z-40 flex size-14 items-center justify-center rounded-full bg-ink text-paper shadow-lg transition-transform hover:scale-105 lg:hidden"
        aria-label="Quick note"
      >
        <Plus size={24} weight="bold" />
      </button>

      {organizeNoteId && (
        <BrunoOrganizePrompt
          noteId={organizeNoteId}
          notebooks={notebooks}
          onClose={() => setOrganizeNoteId(null)}
          onOrganized={() => {
            setOrganizeNoteId(null);
            void loadNotes();
          }}
        />
      )}
    </div>
  );
}
