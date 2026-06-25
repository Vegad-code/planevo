import { getApiUrl } from '@/lib/api';
import { supabase } from '@/lib/supabase';

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export type MobileNoteListItem = {
  id: string;
  title: string;
  note_kind: string;
  canvas_course_name: string | null;
  content_markdown: string | null;
  updated_at: string;
  is_pinned: boolean;
};

export type MobileNoteDetail = MobileNoteListItem & {
  content: string;
  content_json: unknown;
  privacy: string;
  linked_assignment_id: string | null;
};

export async function fetchNotes(query?: string) {
  const headers = await authHeaders();
  const url = query
    ? `${getApiUrl()}/api/notes/search?query=${encodeURIComponent(query)}`
    : `${getApiUrl()}/api/notes`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load notes');
  return (data.notes ?? []) as MobileNoteListItem[];
}

export async function fetchNote(id: string) {
  const headers = await authHeaders();
  const response = await fetch(`${getApiUrl()}/api/notes/${id}`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load note');
  return data.note as MobileNoteDetail;
}

export async function createQuickNote() {
  const headers = await authHeaders();
  const response = await fetch(`${getApiUrl()}/api/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Quick note', noteKind: 'quick_capture', content: '' }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create note');
  return data.note as MobileNoteDetail;
}

export async function updateNote(
  id: string,
  payload: { title?: string; content?: string; contentJson?: unknown }
) {
  const headers = await authHeaders();
  const response = await fetch(`${getApiUrl()}/api/notes/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      title: payload.title,
      content: payload.content,
      contentJson: payload.contentJson,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save note');
  return data.note as MobileNoteDetail;
}

export async function deleteNote(id: string) {
  const headers = await authHeaders();
  const response = await fetch(`${getApiUrl()}/api/notes/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) throw new Error('Failed to delete note');
}

export async function fetchDueFlashcards() {
  const headers = await authHeaders();
  const response = await fetch(`${getApiUrl()}/api/flashcards?due=true`, { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load flashcards');
  return data.flashcards ?? [];
}

export async function reviewFlashcard(flashcardId: string, quality: number) {
  const headers = await authHeaders();
  await fetch(`${getApiUrl()}/api/flashcards`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'review', flashcardId, quality }),
  });
}

export async function syncNotebooks() {
  const headers = await authHeaders();
  await fetch(`${getApiUrl()}/api/notebooks`, { headers });
}
