import type { BlockNoteBlock } from '@planevo/notes-core';
import type { Database } from '@/types/database';

export type NoteRow = Database['public']['Tables']['notes']['Row'] & {
  content_json?: BlockNoteBlock[] | null;
  content_markdown?: string | null;
  notebook_id?: string | null;
  note_kind?: string;
  privacy?: string;
  canvas_course_name?: string | null;
  linked_assignment_id?: string | null;
  linked_task_id?: string | null;
  is_pinned?: boolean;
  is_archived?: boolean;
  is_daily?: boolean;
  daily_date?: string | null;
};

export type NotebookRow = Database['public']['Tables']['notebooks']['Row'];
export type NoteTagRow = Database['public']['Tables']['note_tags']['Row'];
export type FlashcardRow = Database['public']['Tables']['note_flashcards']['Row'];

export const NOTE_LIST_COLUMNS =
  'id, title, subject, notebook_id, note_kind, privacy, canvas_course_name, is_pinned, is_archived, is_daily, daily_date, content_markdown, updated_at, created_at';

export const NOTE_DETAIL_COLUMNS =
  'id, title, subject, content, content_json, content_markdown, notebook_id, note_kind, privacy, canvas_course_name, linked_assignment_id, linked_task_id, is_pinned, is_archived, is_daily, daily_date, source_conversation_id, created_at, updated_at';
