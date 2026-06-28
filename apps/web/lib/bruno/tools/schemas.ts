import { z } from 'zod';

export const BRUNO_ACTION_TYPES = [
  'CREATE_TASK',
  'UPDATE_TASK',
  'RESCHEDULE_TASK',
  'CREATE_TIME_BLOCK',
  'UPDATE_DAILY_PLAN',
  'EXPLAIN_PLAN',
  'NO_ACTION',
  'CREATE_NOTE',
  'UPDATE_NOTE',
  'APPEND_TO_NOTE',
  'ARCHIVE_NOTE',
  'DELETE_CALENDAR_EVENT',
  'DELETE_TASK',
] as const;

export type BrunoActionTypeV3 = (typeof BRUNO_ACTION_TYPES)[number];

export const TASK_STATUS_VALUES = ['todo', 'in_progress', 'done', 'missed'] as const;

export const NOTE_KIND_VALUES = [
  'quick_capture',
  'class_note',
  'study_guide',
  'daily',
  'template_instance',
  'bruno_generated',
] as const;

export const COLOR_CATEGORY_VALUES = [
  'study',
  'exercise',
  'break',
  'admin',
  'work',
  'creative',
  'social',
  'health',
] as const;

export const EXECUTABLE_V3_ACTION_TYPES: ReadonlySet<BrunoActionTypeV3> = new Set([
  'CREATE_TASK',
  'UPDATE_TASK',
  'RESCHEDULE_TASK',
  'CREATE_TIME_BLOCK',
  'UPDATE_DAILY_PLAN',
  'CREATE_NOTE',
  'UPDATE_NOTE',
  'APPEND_TO_NOTE',
  'ARCHIVE_NOTE',
  'DELETE_CALENDAR_EVENT',
  'DELETE_TASK',
  'EXPLAIN_PLAN',
  'NO_ACTION',
]);

export const DESTRUCTIVE_ACTION_TYPES: ReadonlySet<BrunoActionTypeV3> = new Set([
  'DELETE_CALENDAR_EVENT',
  'DELETE_TASK',
]);

function stripNullBytes(value: string): string {
  return value.replace(/\0/g, '');
}

export function sanitizeBrunoString(value: string, maxLength: number): string {
  return stripNullBytes(value).slice(0, maxLength);
}

const brunoPayloadSchema = z
  .object({
    taskTitle: z.string().max(500).optional(),
    notes: z.string().max(5000).optional(),
    estimatedMinutes: z.number().int().min(1).max(1440).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dueDate: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    durationMinutes: z.number().int().min(1).max(1440).optional(),
    location: z.string().max(500).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    colorCategory: z.enum(COLOR_CATEGORY_VALUES).optional(),
    source: z.literal('bruno').optional(),
    noteId: z.string().uuid().optional(),
    noteTitle: z.string().max(500).optional(),
    noteKind: z.enum(NOTE_KIND_VALUES).optional(),
    notebookId: z.string().uuid().optional(),
    subject: z.string().max(200).optional(),
    contentMarkdown: z.string().max(500_000).optional(),
    appendMarkdown: z.string().max(100_000).optional(),
    linkedTaskId: z.string().uuid().optional(),
    isPinned: z.boolean().optional(),
    eventId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    deleteReason: z.string().max(500).optional(),
    planAction: z.enum(['accept', 'reject', 'regenerate']).optional(),
    blockId: z.string().uuid().optional(),
    feedbackAction: z.enum(['accept', 'too_vague', 'too_many_breaks', 'wrong_time']).optional(),
  })
  .passthrough();

export const proposedActionSchema = z.object({
  type: z.enum(BRUNO_ACTION_TYPES),
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(500),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  requiresConfirmation: z.boolean().optional(),
  payload: brunoPayloadSchema.optional().default({}),
});

export type ProposedAction = z.infer<typeof proposedActionSchema>;

export type BrunoToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export const executeActionRequestSchema = z.discriminatedUnion('type', [
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('CREATE_TASK'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('CREATE_TIME_BLOCK'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('UPDATE_TASK'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('RESCHEDULE_TASK'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('DELETE_TASK'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.literal('high'),
    requiresConfirmation: z.literal(true),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('DELETE_CALENDAR_EVENT'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.literal('high'),
    requiresConfirmation: z.literal(true),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('UPDATE_DAILY_PLAN'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('CREATE_NOTE'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('UPDATE_NOTE'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('APPEND_TO_NOTE'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('ARCHIVE_NOTE'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.literal(true),
    payload: brunoPayloadSchema,
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('EXPLAIN_PLAN'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema.optional().default({}),
  }),
  z.object({
    proposalId: z.string().min(1),
    type: z.literal('NO_ACTION'),
    title: z.string().optional(),
    description: z.string().optional(),
    userPrompt: z.string().optional(),
    timeZone: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    requiresConfirmation: z.boolean().optional(),
    payload: brunoPayloadSchema.optional().default({}),
  }),
]);

export type ExecuteActionRequest = z.infer<typeof executeActionRequestSchema>;

export function toProposedAction(input: ExecuteActionRequest): ProposedAction {
  return proposedActionSchema.parse({
    type: input.type,
    title: input.title ?? input.type,
    description: input.description ?? '',
    riskLevel: input.riskLevel,
    requiresConfirmation: input.requiresConfirmation,
    payload: input.payload ?? {},
  });
}
