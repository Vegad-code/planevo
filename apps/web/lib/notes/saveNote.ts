import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { CreateNoteInput, BlockNoteBlock } from '@planevo/notes-core';
import { blocksToMarkdown, markdownToPlainParagraphBlocks } from '@planevo/notes-core';
import { createNoteRecord, resolveNoteContent } from './noteService';

export type SaveNoteInput = {
  userId: string;
  title: string;
  subject?: string | null;
  content: string;
  contentJson?: BlockNoteBlock[];
  notebookId?: string | null;
  noteKind?: string;
  sourceConversationId?: string | null;
  isBrunoContent?: boolean;
};

export async function saveNoteForUser(
  supabase: SupabaseClient<Database>,
  input: SaveNoteInput
) {
  return createNoteRecord(supabase, input.userId, {
    title: input.title,
    subject: input.subject,
    content: input.content,
    contentJson: input.contentJson,
    notebookId: input.notebookId,
    noteKind: (input.noteKind as CreateNoteInput['noteKind']) ?? 'quick_capture',
    sourceConversationId: input.sourceConversationId,
    isBrunoContent: input.isBrunoContent,
  });
}

export function legacyContentToBlocks(content: string): BlockNoteBlock[] {
  return markdownToPlainParagraphBlocks(content);
}

export function blocksToLegacyContent(blocks: BlockNoteBlock[]): string {
  return blocksToMarkdown(blocks);
}

export { resolveNoteContent };
