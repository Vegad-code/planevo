import type { NoteAccentKey } from '@planevo/notes-core';

export const NOTE_ACCENT_CLASS: Record<NoteAccentKey, string> = {
  yellow: 'note-card-accent-yellow',
  coral: 'note-card-accent-coral',
  sky: 'note-card-accent-sky',
  green: 'note-card-accent-green',
  cream: 'note-card-accent-cream',
};

export function noteAccentClass(accent: NoteAccentKey): string {
  return NOTE_ACCENT_CLASS[accent];
}

export type NoteListItem = {
  id: string;
  title: string;
  subject: string | null;
  notebook_id: string | null;
  note_kind: string;
  is_pinned: boolean;
  is_daily: boolean;
  canvas_course_name: string | null;
  content_markdown: string | null;
  updated_at: string;
};

export type Notebook = {
  id: string;
  name: string;
  kind: string;
  canvas_course_name: string | null;
};
