'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  createNoteSchema,
  updateNoteSchema,
  organizeNoteSchema,
  createFlashcardSchema,
  reviewFlashcardSchema,
  extractFlashcardCandidates,
  extractTaskCandidates,
  reviewFlashcard,
  defaultFlashcardSrs,
  type BlockNoteBlock,
} from '@planevo/notes-core';
import {
  createNoteRecord,
  updateNoteRecord,
  ensureDefaultNotebooks,
  syncCourseNotebooks,
  getOrCreateDailyNote,
} from './noteService';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function createNoteAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid note payload' };

  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data, error } = await createNoteRecord(supabase, user.id, parsed.data);
  if (error || !data) return { success: false, error: 'Failed to create note' };

  revalidatePath('/dashboard/notes');
  return { success: true, data: { id: data.id } };
}

export async function updateNoteAction(
  noteId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid update payload' };

  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data, error } = await updateNoteRecord(supabase, user.id, noteId, {
    ...parsed.data,
    contentJson: parsed.data.contentJson as BlockNoteBlock[] | undefined,
    isPinned: parsed.data.isPinned,
    isArchived: parsed.data.isArchived,
  });
  if (error || !data) return { success: false, error: 'Failed to update note' };

  revalidatePath('/dashboard/notes');
  revalidatePath(`/dashboard/notes/${noteId}`);
  return { success: true, data: { id: data.id } };
}

export async function organizeNoteAction(input: unknown): Promise<ActionResult> {
  const parsed = organizeNoteSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid organize payload' };

  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { error } = await updateNoteRecord(supabase, user.id, parsed.data.noteId, {
    notebookId: parsed.data.notebookId,
    noteKind: parsed.data.noteKind,
    canvasCourseName: parsed.data.canvasCourseName,
    linkedAssignmentId: parsed.data.linkedAssignmentId,
    tagIds: parsed.data.tagIds,
  });
  if (error) return { success: false, error: 'Failed to organize note' };

  revalidatePath('/dashboard/notes');
  return { success: true, data: undefined };
}

export async function ensureNotebooksAction(): Promise<ActionResult<{ notebooks: unknown[] }>> {
  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: assignments } = await supabase
    .from('canvas_assignments')
    .select('course_name')
    .eq('user_id', user.id);

  const courses = (assignments ?? []).map((a) => a.course_name).filter(Boolean) as string[];
  await syncCourseNotebooks(supabase, user.id, courses);
  const notebooks = await ensureDefaultNotebooks(supabase, user.id);

  return { success: true, data: { notebooks } };
}

export async function getDailyNoteAction(date?: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const dailyDate = date ?? new Date().toISOString().slice(0, 10);
  const note = await getOrCreateDailyNote(supabase, user.id, dailyDate);
  if (!note) return { success: false, error: 'Failed to get daily note' };

  return { success: true, data: { id: note.id } };
}

export async function createFlashcardsFromNoteAction(
  noteId: string
): Promise<ActionResult<{ count: number }>> {
  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: note } = await supabase
    .from('notes')
    .select('content_json')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!note?.content_json) return { success: false, error: 'Note not found' };

  const candidates = extractFlashcardCandidates(note.content_json as unknown as BlockNoteBlock[]);
  if (candidates.length === 0) return { success: false, error: 'No flashcard content found' };

  const srs = defaultFlashcardSrs();
  await supabase.from('note_flashcards').insert(
    candidates.map((card) => ({
      user_id: user.id,
      note_id: noteId,
      block_id: card.blockId,
      front: card.front,
      back: card.back,
      interval_days: srs.interval,
      ease_factor: srs.ease,
    }))
  );

  revalidatePath('/dashboard/notes/flashcards');
  return { success: true, data: { count: candidates.length } };
}

export async function createFlashcardAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createFlashcardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid flashcard' };

  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const srs = defaultFlashcardSrs();
  const { data, error } = await supabase
    .from('note_flashcards')
    .insert({
      user_id: user.id,
      note_id: parsed.data.noteId,
      block_id: parsed.data.blockId ?? null,
      front: parsed.data.front,
      back: parsed.data.back,
      interval_days: srs.interval,
      ease_factor: srs.ease,
    })
    .select('id')
    .single();

  if (error || !data) return { success: false, error: 'Failed to create flashcard' };
  return { success: true, data: { id: data.id } };
}

export async function reviewFlashcardAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewFlashcardSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid review' };

  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: card } = await supabase
    .from('note_flashcards')
    .select('*')
    .eq('id', parsed.data.flashcardId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!card) return { success: false, error: 'Flashcard not found' };

  const result = reviewFlashcard(parsed.data.quality, card.interval_days, card.ease_factor);
  await supabase
    .from('note_flashcards')
    .update({
      interval_days: result.interval,
      ease_factor: result.ease,
      next_review_at: result.nextReviewAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', card.id);

  return { success: true, data: undefined };
}

export async function extractTasksFromNoteAction(
  noteId: string
): Promise<ActionResult<{ taskIds: string[] }>> {
  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: note } = await supabase
    .from('notes')
    .select('content_json')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!note?.content_json) return { success: false, error: 'Note not found' };

  const candidates = extractTaskCandidates(note.content_json as unknown as BlockNoteBlock[]);
  const taskIds: string[] = [];

  for (const task of candidates) {
    const { data } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: task.title,
        priority: 'medium',
        status: 'todo',
        completed: false,
      })
      .select('id')
      .single();
    if (data) taskIds.push(data.id);
  }

  revalidatePath('/dashboard/tasks');
  return { success: true, data: { taskIds } };
}

export async function restoreNoteRevisionAction(
  noteId: string,
  revisionId: string
): Promise<ActionResult> {
  const { supabase, user } = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: revision } = await supabase
    .from('note_revisions')
    .select('*')
    .eq('id', revisionId)
    .eq('note_id', noteId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!revision) return { success: false, error: 'Revision not found' };

  await updateNoteRecord(supabase, user.id, noteId, {
    title: revision.title,
    contentJson: revision.content_json as unknown as BlockNoteBlock[],
  });

  revalidatePath(`/dashboard/notes/${noteId}`);
  return { success: true, data: undefined };
}
