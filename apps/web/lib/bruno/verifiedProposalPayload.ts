import {
  DESTRUCTIVE_ACTION_TYPES,
  executeActionRequestSchema,
  type BrunoActionTypeV3,
  type ExecuteActionRequest,
} from '@/lib/bruno/tools/schemas';

export type LoggedProposalRecord = {
  type?: unknown;
  title?: unknown;
  description?: unknown;
  riskLevel?: unknown;
  requiresConfirmation?: unknown;
  payload?: unknown;
};

/** Build execute input exclusively from server-logged proposal arguments. */
export function buildAuthorizedExecuteRequest(
  proposalId: string,
  logged: LoggedProposalRecord,
  clientHints: {
    userPrompt?: string;
    timeZone?: string;
  }
): ExecuteActionRequest | { error: string } {
  if (typeof logged.type !== 'string' || typeof logged.title !== 'string') {
    return { error: 'Logged proposal is missing required fields.' };
  }

  const payload =
    logged.payload && typeof logged.payload === 'object' && !Array.isArray(logged.payload)
      ? (logged.payload as Record<string, unknown>)
      : {};

  // Destructive actions carry non-negotiable invariants; normalize them here
  // so legacy proposals logged before the invariants existed still parse.
  // The user's explicit confirm click is what authorizes execution.
  const isDestructive = DESTRUCTIVE_ACTION_TYPES.has(
    logged.type as BrunoActionTypeV3
  );

  const candidate = {
    proposalId,
    type: logged.type,
    title: logged.title,
    description: typeof logged.description === 'string' ? logged.description : logged.title,
    userPrompt: clientHints.userPrompt,
    timeZone: clientHints.timeZone,
    riskLevel: isDestructive
      ? 'high'
      : logged.riskLevel === 'medium' || logged.riskLevel === 'high'
        ? logged.riskLevel
        : 'low',
    requiresConfirmation:
      isDestructive ||
      logged.type === 'ARCHIVE_NOTE' ||
      (typeof logged.requiresConfirmation === 'boolean'
        ? logged.requiresConfirmation
        : true),
    payload,
  };

  const parsed = executeActionRequestSchema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => issue.message)
      .slice(0, 3)
      .join('; ');
    return {
      error: `Logged proposal failed validation (${issues}). Ask Bruno to regenerate it.`,
    };
  }

  return parsed.data;
}

export function detectClientPayloadTampering(
  clientPayload: Record<string, unknown> | undefined,
  loggedPayload: Record<string, unknown>
): string | null {
  if (!clientPayload || Object.keys(clientPayload).length === 0) return null;

  const sensitiveKeys = [
    'eventId',
    'externalId',
    'googleEventId',
    'taskId',
    'noteId',
    'blockId',
    'startTime',
    'endTime',
    'start_time',
    'end_time',
    'dueDate',
    'contentMarkdown',
    'appendMarkdown',
    'planAction',
    'deleteReason',
  ] as const;

  for (const key of sensitiveKeys) {
    if (!(key in clientPayload)) continue;
    const clientValue = clientPayload[key];
    const loggedValue = loggedPayload[key];
    if (loggedValue === undefined) continue;
    if (JSON.stringify(clientValue) !== JSON.stringify(loggedValue)) {
      return `Client payload override detected for ${key}.`;
    }
  }

  return null;
}
