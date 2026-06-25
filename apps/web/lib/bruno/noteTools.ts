import { tool, jsonSchema } from 'ai';
import {
  markdownToStructuredBlocks,
  BRUNO_SECTION_MAP,
  inferTitleFromMarkdown,
  blocksToMarkdown,
  type BlockNoteBlock,
} from '@planevo/notes-core';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNoteRecord, updateNoteRecord, ensureDefaultNotebooks } from '@/lib/notes/noteService';
import { sanitizeSearchQuery } from './readTools';

export function getBrunoNoteTools(userId: string) {
  return {
    search_notes: tool({
      description: 'Search the user saved notes by keyword. Use when they ask about past notes or study material.',
      inputSchema: jsonSchema<{ query: string; limit?: number }>({
        type: 'object',
        properties: {
          query: { type: 'string', maxLength: 200 },
          limit: { type: 'number' },
        },
        required: ['query'],
      }),
      execute: async ({ query, limit }: { query: string; limit?: number }) => {
        const sanitized = sanitizeSearchQuery(query);
        if (!sanitized) return { success: false, notes: [] };

        const { data, error } = await supabaseAdmin
          .from('notes')
          .select('id, title, note_kind, canvas_course_name, content_markdown, updated_at')
          .eq('user_id', userId)
          .eq('is_archived', false)
          .textSearch('search_vector', sanitized)
          .limit(Math.min(limit ?? 10, 20));

        if (error) return { success: false, error: error.message };
        return { success: true, notes: data ?? [] };
      },
    }),

    save_structured_note: tool({
      description:
        'Save structured study notes to the user Notes library. Content should use ## Summary, ## Key Terms, ## Checklist, ## Study Questions, ## Next Actions sections.',
      inputSchema: jsonSchema<{
        title?: string;
        subject?: string;
        content: string;
        canvasCourseName?: string;
      }>({
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 200 },
          subject: { type: 'string', maxLength: 120 },
          content: { type: 'string', maxLength: 200000 },
          canvasCourseName: { type: 'string', maxLength: 200 },
        },
        required: ['content'],
      }),
      execute: async ({
        title,
        subject,
        content,
        canvasCourseName,
      }: {
        title?: string;
        subject?: string;
        content: string;
        canvasCourseName?: string;
      }) => {
        await ensureDefaultNotebooks(supabaseAdmin, userId);
        const contentJson = markdownToStructuredBlocks(content, BRUNO_SECTION_MAP);
        const resolvedTitle = title ?? inferTitleFromMarkdown(content, 'Study notes');

        const { data, error } = await createNoteRecord(supabaseAdmin, userId, {
          title: resolvedTitle,
          subject,
          contentJson: contentJson as BlockNoteBlock[],
          content: blocksToMarkdown(contentJson),
          canvasCourseName,
          noteKind: 'bruno_generated',
          isBrunoContent: true,
        });

        if (error || !data) return { success: false, error: 'Failed to save note' };
        return {
          success: true,
          noteId: data.id,
          title: data.title,
          message: `Saved to Notes as "${data.title}".`,
        };
      },
    }),

    organize_note: tool({
      description: 'File an existing note into a notebook, class, or category.',
      inputSchema: jsonSchema<{
        noteId: string;
        notebookName?: string;
        noteKind?: string;
        canvasCourseName?: string;
      }>({
        type: 'object',
        properties: {
          noteId: { type: 'string' },
          notebookName: { type: 'string' },
          noteKind: { type: 'string' },
          canvasCourseName: { type: 'string' },
        },
        required: ['noteId'],
      }),
      execute: async ({
        noteId,
        notebookName,
        noteKind,
        canvasCourseName,
      }: {
        noteId: string;
        notebookName?: string;
        noteKind?: string;
        canvasCourseName?: string;
      }) => {
        let notebookId: string | null = null;
        if (notebookName) {
          const { data: existing } = await supabaseAdmin
            .from('notebooks')
            .select('id')
            .eq('user_id', userId)
            .ilike('name', notebookName)
            .maybeSingle();

          if (existing) {
            notebookId = existing.id;
          } else {
            const { data: created } = await supabaseAdmin
              .from('notebooks')
              .insert({
                user_id: userId,
                name: notebookName,
                kind: canvasCourseName ? 'course' : 'personal',
                canvas_course_name: canvasCourseName ?? null,
              })
              .select('id')
              .single();
            notebookId = created?.id ?? null;
          }
        }

        const { data, error } = await updateNoteRecord(supabaseAdmin, userId, noteId, {
          notebookId,
          noteKind: noteKind as 'class_note' | undefined,
          canvasCourseName,
        });

        if (error || !data) return { success: false, error: 'Failed to organize note' };
        return { success: true, noteId: data.id, message: 'Note organized.' };
      },
    }),
  };
}
