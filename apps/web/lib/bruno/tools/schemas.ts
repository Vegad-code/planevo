import { z } from 'zod';

export const BRUNO_ACTION_TYPES = [
  'CREATE_TASK',
  'UPDATE_TASK',
  'RESCHEDULE_TASK',
  'CREATE_TIME_BLOCK',
  'UPDATE_CALENDAR_EVENT',
  'UPDATE_DAILY_PLAN',
  'EXPLAIN_PLAN',
  'NO_ACTION',
  'CREATE_NOTE',
  'UPDATE_NOTE',
  'APPEND_TO_NOTE',
  'ARCHIVE_NOTE',
  'DELETE_CALENDAR_EVENT',
  'DELETE_TASK',
  'APPLY_PLAN',
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
  'UPDATE_CALENDAR_EVENT',
  'UPDATE_DAILY_PLAN',
  'CREATE_NOTE',
  'UPDATE_NOTE',
  'APPEND_TO_NOTE',
  'ARCHIVE_NOTE',
  'DELETE_CALENDAR_EVENT',
  'DELETE_TASK',
  'APPLY_PLAN',
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
    status: z.enum(TASK_STATUS_VALUES).optional(),
    completed: z.boolean().optional(),
    completedAt: z.string().optional(),
    completed_at: z.string().optional(),
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
    externalId: z.string().max(1024).optional(),
    googleEventId: z.string().max(1024).optional(),
    taskId: z.string().uuid().optional(),
    deleteReason: z.string().max(500).optional(),
    planAction: z.enum(['accept', 'reject', 'regenerate']).optional(),
    blockId: z.string().uuid().optional(),
    feedbackAction: z.enum(['accept', 'too_vague', 'too_many_breaks', 'wrong_time']).optional(),
  })
  .passthrough();

export const proposedActionBaseSchema = z.object({
  type: z.enum(BRUNO_ACTION_TYPES),
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(500),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  requiresConfirmation: z.boolean().optional(),
  payload: brunoPayloadSchema.optional().default({}),
});

export const PLAN_STEP_ACTION_TYPES = BRUNO_ACTION_TYPES.filter(
  (type) => type !== 'APPLY_PLAN' && type !== 'NO_ACTION' && type !== 'EXPLAIN_PLAN'
);

export const applyPlanStepSchema = z.object({
  type: z.enum(PLAN_STEP_ACTION_TYPES as [BrunoActionTypeV3, ...BrunoActionTypeV3[]]),
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(500).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  requiresConfirmation: z.boolean().optional(),
  ref: z.string().max(60).optional(),
  payload: brunoPayloadSchema.optional().default({}),
});

export const applyPlanPayloadSchema = z
  .object({
    planSummary: z.string().max(2000).optional(),
    steps: z.array(applyPlanStepSchema).min(1).max(20),
  })
  .passthrough();

/**
 * Per-action-type required fields, enforced at PROPOSE time (inside the agent
 * loop, where the model can read the error and self-correct) instead of at
 * execute time, after the user has already confirmed the card.
 */
export const proposedActionSchema = proposedActionBaseSchema.superRefine(
  (action, ctx) => {
    const payload = action.payload ?? {};
    const require = (condition: boolean, message: string) => {
      if (!condition) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['payload'] });
      }
    };

    switch (action.type) {
      case 'UPDATE_TASK':
      case 'RESCHEDULE_TASK':
      case 'DELETE_TASK':
        require(
          Boolean(payload.taskId),
          `${action.type} requires payload.taskId — call get_tasks or search_tasks first and use the real task id.`
        );
        break;
      case 'UPDATE_CALENDAR_EVENT':
      case 'DELETE_CALENDAR_EVENT':
        require(
          Boolean(payload.eventId || payload.externalId || payload.googleEventId),
          `${action.type} requires payload.eventId — call get_calendar_events or search_calendar_events first and use the real event id.`
        );
        break;
      case 'CREATE_TIME_BLOCK':
        require(
          Boolean(payload.startTime || payload.dueDate),
          'CREATE_TIME_BLOCK requires payload.startTime (ISO datetime, or a resolvable expression like "tomorrow at 3pm").'
        );
        break;
      case 'UPDATE_NOTE':
      case 'APPEND_TO_NOTE':
      case 'ARCHIVE_NOTE':
        require(
          Boolean(payload.noteId),
          `${action.type} requires payload.noteId — call search_notes first and use the real note id.`
        );
        break;
      case 'UPDATE_DAILY_PLAN':
        require(
          Boolean(payload.planAction),
          'UPDATE_DAILY_PLAN requires payload.planAction ("accept", "reject", or "regenerate").'
        );
        break;
      case 'APPLY_PLAN': {
        const plan = applyPlanPayloadSchema.safeParse(payload);
        require(
          plan.success,
          plan.success
            ? ''
            : `APPLY_PLAN payload invalid: ${plan.error.issues
                .map((issue) => issue.message)
                .slice(0, 3)
                .join('; ')}`
        );
        break;
      }
      default:
        break;
    }
  }
);

export type ProposedAction = z.infer<typeof proposedActionBaseSchema>;

/** Coerce loose LLM tool args before enrich + strict validation. */
export function coerceProposedActionInput(
  proposal: unknown
): Record<string, unknown> {
  const argsObj =
    typeof proposal === 'object' && proposal !== null
      ? (proposal as Record<string, unknown>)
      : { value: String(proposal) };

  const title =
    typeof argsObj.title === 'string' && argsObj.title.trim().length > 0
      ? argsObj.title.trim()
      : 'Proposed action';
  const description =
    typeof argsObj.description === 'string' && argsObj.description.trim().length > 0
      ? argsObj.description.trim()
      : title;

  // Destructive actions always carry the high-risk + explicit-confirmation
  // invariants, regardless of what the model set — the execute-time
  // discriminated union requires them.
  const isDestructive = DESTRUCTIVE_ACTION_TYPES.has(
    argsObj.type as BrunoActionTypeV3
  );

  return {
    ...argsObj,
    title,
    description,
    riskLevel: isDestructive
      ? 'high'
      : argsObj.riskLevel === 'medium' || argsObj.riskLevel === 'high'
        ? argsObj.riskLevel
        : 'low',
    requiresConfirmation:
      isDestructive || argsObj.type === 'ARCHIVE_NOTE'
        ? true
        : argsObj.requiresConfirmation,
    payload:
      typeof argsObj.payload === 'object' &&
      argsObj.payload !== null &&
      !Array.isArray(argsObj.payload)
        ? argsObj.payload
        : {},
  };
}

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
    type: z.literal('UPDATE_CALENDAR_EVENT'),
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
    type: z.literal('APPLY_PLAN'),
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
  // Structure-only parse: execute-time must stay lenient so previously logged
  // proposals (e.g. calendar actions resolved via the title-fallback chain)
  // still execute. The per-type required-field refinement binds at propose
  // time via proposedActionSchema.
  return proposedActionBaseSchema.parse({
    type: input.type,
    title: input.title ?? input.type,
    description: input.description ?? '',
    riskLevel: input.riskLevel,
    requiresConfirmation: input.requiresConfirmation,
    payload: input.payload ?? {},
  });
}
