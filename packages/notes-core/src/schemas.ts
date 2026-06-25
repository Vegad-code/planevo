import { z } from 'zod';
import { NOTE_KINDS, NOTE_PRIVACY, NOTEBOOK_KINDS, SYSTEM_TEMPLATE_IDS } from './constants';

export const noteKindSchema = z.enum(NOTE_KINDS);
export const notePrivacySchema = z.enum(NOTE_PRIVACY);
export const notebookKindSchema = z.enum(NOTEBOOK_KINDS);
export const systemTemplateIdSchema = z.enum(SYSTEM_TEMPLATE_IDS);

export const blockNoteBlockSchema = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.unknown()).default({}),
    content: z
      .array(
        z.object({
          type: z.string(),
          text: z.string(),
          styles: z.record(z.unknown()).optional(),
          href: z.string().optional(),
        })
      )
      .optional(),
    children: z.array(z.any()).default([]),
  })
);

export const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().max(120).optional().nullable(),
  content: z.string().max(200_000).optional(),
  contentJson: z.array(blockNoteBlockSchema).optional(),
  notebookId: z.string().uuid().optional().nullable(),
  noteKind: noteKindSchema.optional().default('quick_capture'),
  privacy: notePrivacySchema.optional().default('private'),
  canvasCourseName: z.string().max(200).optional().nullable(),
  linkedAssignmentId: z.string().uuid().optional().nullable(),
  linkedTaskId: z.string().uuid().optional().nullable(),
  isDaily: z.boolean().optional().default(false),
  dailyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sourceConversationId: z.string().uuid().optional().nullable(),
  templateId: systemTemplateIdSchema.optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateNoteSchema = createNoteSchema.partial().extend({
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const organizeNoteSchema = z.object({
  noteId: z.string().uuid(),
  notebookId: z.string().uuid().optional().nullable(),
  noteKind: noteKindSchema.optional(),
  canvasCourseName: z.string().max(200).optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  linkedAssignmentId: z.string().uuid().optional().nullable(),
});

export const createNotebookSchema = z.object({
  name: z.string().min(1).max(120),
  kind: notebookKindSchema.default('personal'),
  icon: z.string().max(40).optional().nullable(),
  canvasCourseName: z.string().max(200).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

export const createFlashcardSchema = z.object({
  noteId: z.string().uuid(),
  blockId: z.string().optional().nullable(),
  front: z.string().min(1).max(2000),
  back: z.string().min(1).max(4000),
});

export const reviewFlashcardSchema = z.object({
  flashcardId: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
});

export const searchNotesSchema = z.object({
  query: z.string().min(1).max(200),
  notebookId: z.string().uuid().optional(),
  noteKind: noteKindSchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type OrganizeNoteInput = z.infer<typeof organizeNoteSchema>;
