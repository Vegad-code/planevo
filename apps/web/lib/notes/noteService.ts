import type { SupabaseClient } from '@supabase/supabase-js';
import {
  blocksToMarkdown,
  extractBlockRefs,
  markdownToPlainParagraphBlocks,
  markdownToStructuredBlocks,
  BRUNO_SECTION_MAP,
  DEFAULT_NOTEBOOKS,
  type BlockNoteBlock,
  type CreateNoteInput,
} from '@planevo/notes-core';
import type { Database, Json } from '@/types/database';
import { NOTE_DETAIL_COLUMNS } from './types';

type Supabase = SupabaseClient<Database>;

export function resolveNoteContent(input: {
  content?: string;
  contentJson?: BlockNoteBlock[];
  isBrunoContent?: boolean;
}): { contentJson: BlockNoteBlock[]; contentMarkdown: string } {
  if (input.contentJson?.length) {
    return {
      contentJson: input.contentJson,
      contentMarkdown: blocksToMarkdown(input.contentJson),
    };
  }

  const markdown = input.content ?? '';
  const contentJson = input.isBrunoContent
    ? markdownToStructuredBlocks(markdown, BRUNO_SECTION_MAP)
    : markdownToPlainParagraphBlocks(markdown);

  return {
    contentJson,
    contentMarkdown: blocksToMarkdown(contentJson) || markdown,
  };
}

export async function ensureDefaultNotebooks(supabase: Supabase, userId: string) {
  const { data: existing } = await supabase
    .from('notebooks')
    .select('id, kind')
    .eq('user_id', userId);

  const existingKinds = new Set((existing ?? []).map((n) => n.kind));
  const toInsert = DEFAULT_NOTEBOOKS.filter((nb) => !existingKinds.has(nb.kind)).map((nb) => ({
    user_id: userId,
    name: nb.name,
    kind: nb.kind,
    icon: nb.icon,
    sort_order: nb.sort_order,
  }));

  if (toInsert.length > 0) {
    await supabase.from('notebooks').insert(toInsert);
  }

  const { data: notebooks } = await supabase
    .from('notebooks')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  return notebooks ?? [];
}

export async function getInboxNotebookId(supabase: Supabase, userId: string) {
  const notebooks = await ensureDefaultNotebooks(supabase, userId);
  return notebooks.find((n) => n.kind === 'inbox')?.id ?? null;
}

export async function syncCourseNotebooks(
  supabase: Supabase,
  userId: string,
  courseNames: string[]
) {
  const unique = [...new Set(courseNames.filter(Boolean))];
  if (unique.length === 0) return;

  const { data: existing } = await supabase
    .from('notebooks')
    .select('id, canvas_course_name')
    .eq('user_id', userId)
    .eq('kind', 'course');

  const existingCourses = new Set((existing ?? []).map((n) => n.canvas_course_name));
  const toInsert = unique
    .filter((name) => !existingCourses.has(name))
    .map((name, index) => ({
      user_id: userId,
      name,
      kind: 'course' as const,
      canvas_course_name: name,
      icon: 'book',
      sort_order: 100 + index,
    }));

  if (toInsert.length > 0) {
    await supabase.from('notebooks').insert(toInsert);
  }
}

export async function rebuildBlockRefs(
  supabase: Supabase,
  userId: string,
  noteId: string,
  blocks: BlockNoteBlock[]
) {
  await supabase.from('note_block_refs').delete().eq('note_id', noteId).eq('user_id', userId);

  const refs = extractBlockRefs(blocks);
  if (refs.length === 0) return;

  await supabase.from('note_block_refs').insert(
    refs.map((ref) => ({
      user_id: userId,
      note_id: noteId,
      block_id: ref.blockId,
      block_type: ref.blockType,
      text_preview: ref.textPreview,
    }))
  );
}

export async function saveNoteRevision(
  supabase: Supabase,
  userId: string,
  note: { id: string; title: string; content_json: unknown; content_markdown: string | null }
) {
  await supabase.from('note_revisions').insert({
    user_id: userId,
    note_id: note.id,
    title: note.title,
    content_json: note.content_json as Database['public']['Tables']['note_revisions']['Insert']['content_json'],
    content_markdown: note.content_markdown,
  });

  const { data: revisions } = await supabase
    .from('note_revisions')
    .select('id')
    .eq('note_id', note.id)
    .order('created_at', { ascending: false });

  const overflow = (revisions ?? []).slice(20);
  if (overflow.length > 0) {
    await supabase
      .from('note_revisions')
      .delete()
      .in('id', overflow.map((r) => r.id));
  }
}

export async function createNoteRecord(
  supabase: Supabase,
  userId: string,
  input: Partial<CreateNoteInput> & {
    title: string;
    isBrunoContent?: boolean;
  }
) {
  const { contentJson, contentMarkdown } = resolveNoteContent({
    content: input.content,
    contentJson: input.contentJson as BlockNoteBlock[] | undefined,
    isBrunoContent: input.isBrunoContent,
  });

  let notebookId = input.notebookId ?? null;
  if (!notebookId) {
    notebookId = await getInboxNotebookId(supabase, userId);
  }

  const noteKind = input.isBrunoContent ? 'bruno_generated' : (input.noteKind ?? 'quick_capture');

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      title: input.title,
      subject: input.subject ?? null,
      content: contentMarkdown,
      content_json: contentJson as unknown as Database['public']['Tables']['notes']['Insert']['content_json'],
      content_markdown: contentMarkdown,
      notebook_id: notebookId,
      note_kind: noteKind,
      privacy: input.privacy ?? 'private',
      canvas_course_name: input.canvasCourseName ?? null,
      linked_assignment_id: input.linkedAssignmentId ?? null,
      linked_task_id: input.linkedTaskId ?? null,
      is_daily: input.isDaily ?? false,
      daily_date: input.dailyDate ?? null,
      source_conversation_id: input.sourceConversationId ?? null,
      updated_at: new Date().toISOString(),
    })
    .select(NOTE_DETAIL_COLUMNS)
    .single();

  if (error || !data) return { data: null, error };

  await rebuildBlockRefs(supabase, userId, data.id, contentJson);

  if (input.tagIds?.length) {
    await supabase.from('note_tag_assignments').insert(
      input.tagIds.map((tagId) => ({ note_id: data.id, tag_id: tagId, user_id: userId }))
    );
  }

  return { data, error: null };
}

export async function updateNoteRecord(
  supabase: Supabase,
  userId: string,
  noteId: string,
  input: Partial<CreateNoteInput> & {
    isPinned?: boolean;
    isArchived?: boolean;
    contentJson?: BlockNoteBlock[];
  }
) {
  const { data: existing } = await supabase
    .from('notes')
    .select(NOTE_DETAIL_COLUMNS)
    .eq('id', noteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) return { data: null, error: new Error('Note not found') };

  await saveNoteRevision(supabase, userId, {
    id: existing.id,
    title: existing.title,
    content_json: existing.content_json,
    content_markdown: existing.content_markdown ?? existing.content,
  });

  const updates: Database['public']['Tables']['notes']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updates.title = input.title;
  if (input.subject !== undefined) updates.subject = input.subject;
  if (input.notebookId !== undefined) updates.notebook_id = input.notebookId;
  if (input.noteKind !== undefined) updates.note_kind = input.noteKind;
  if (input.privacy !== undefined) updates.privacy = input.privacy;
  if (input.canvasCourseName !== undefined) updates.canvas_course_name = input.canvasCourseName;
  if (input.linkedAssignmentId !== undefined) updates.linked_assignment_id = input.linkedAssignmentId;
  if (input.linkedTaskId !== undefined) updates.linked_task_id = input.linkedTaskId;
  if (input.isPinned !== undefined) updates.is_pinned = input.isPinned;
  if (input.isArchived !== undefined) updates.is_archived = input.isArchived;

  if (input.contentJson !== undefined || input.content !== undefined) {
    const resolved = resolveNoteContent({
      content: input.content,
      contentJson: input.contentJson,
    });
    updates.content = resolved.contentMarkdown;
    updates.content_json = resolved.contentJson as unknown as Json;
    updates.content_markdown = resolved.contentMarkdown;
  }

  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', noteId)
    .eq('user_id', userId)
    .select(NOTE_DETAIL_COLUMNS)
    .single();

  if (error || !data) return { data: null, error };

  if (input.contentJson !== undefined || input.content !== undefined) {
    const blocks =
      (input.contentJson as BlockNoteBlock[] | undefined) ??
      resolveNoteContent({ content: input.content }).contentJson;
    await rebuildBlockRefs(supabase, userId, noteId, blocks);
  }

  if (input.tagIds) {
    await supabase.from('note_tag_assignments').delete().eq('note_id', noteId).eq('user_id', userId);
    if (input.tagIds.length > 0) {
      await supabase.from('note_tag_assignments').insert(
        input.tagIds.map((tagId) => ({ note_id: noteId, tag_id: tagId, user_id: userId }))
      );
    }
  }

  return { data, error: null };
}

export async function getOrCreateDailyNote(supabase: Supabase, userId: string, date: string) {
  const { data: existing } = await supabase
    .from('notes')
    .select(NOTE_DETAIL_COLUMNS)
    .eq('user_id', userId)
    .eq('is_daily', true)
    .eq('daily_date', date)
    .maybeSingle();

  if (existing) return existing;

  const title = `Daily — ${date}`;
  const { data } = await createNoteRecord(supabase, userId, {
    title,
    noteKind: 'daily',
    isDaily: true,
    dailyDate: date,
    contentJson: markdownToPlainParagraphBlocks(''),
  });

  return data;
}
