import type { UIMessage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';
import {
  buildActiveBranchTranscript,
  type BranchMessageRow,
} from '@/lib/bruno/messageBranches';

type Supabase = SupabaseClient<Database>;

export type ServerChatMessageInput = {
  id?: string;
  role: string;
  content?: string | unknown[] | null;
  parts?: unknown[];
};

/** Max serialized size for a stored parts array; beyond this we fall back to text-only. */
const MAX_STORED_PARTS_BYTES = 200_000;
/** Max serialized size for a single tool part's output before it is truncated. */
const MAX_TOOL_OUTPUT_BYTES = 8_000;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractMessageText(message: ServerChatMessageInput): string {
  if (typeof message.content === 'string' && message.content.length > 0) {
    return message.content;
  }
  if (Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        (part as { type: string }).type === 'text' &&
        'text' in part &&
        typeof (part as { text: unknown }).text === 'string'
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return '';
}

export function extractTextFromParts(parts: unknown[]): string {
  return parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        isRecord(part) && part.type === 'text' && typeof part.text === 'string'
    )
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function toUiMessage(
  id: string,
  role: 'user' | 'assistant',
  text: string
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text }],
  };
}

/**
 * Reduce a UIMessage parts array to what is worth persisting: text, tool
 * invocations (with oversized outputs truncated), and data parts the UI
 * rehydrates (action proposals, clarification cards). Reasoning deltas and
 * provider metadata are dropped — they are transient stream artifacts.
 */
export function sanitizeUiMessagePartsForStorage(
  parts: unknown[]
): Json[] | null {
  const kept: Json[] = [];

  for (const part of parts) {
    if (!isRecord(part) || typeof part.type !== 'string') continue;
    const type = part.type;

    if (type === 'reasoning' || type === 'step-start' || type === 'source-url') {
      continue;
    }

    if (type === 'text') {
      if (typeof part.text === 'string' && part.text.length > 0) {
        kept.push({ type: 'text', text: part.text } as Json);
      }
      continue;
    }

    if (type.startsWith('tool-') || type === 'dynamic-tool') {
      const clone: Record<string, unknown> = { ...part };
      delete clone.callProviderMetadata;
      delete clone.providerMetadata;
      if ('output' in clone) {
        try {
          const size = JSON.stringify(clone.output)?.length ?? 0;
          if (size > MAX_TOOL_OUTPUT_BYTES) {
            clone.output = { truncated: true };
          }
        } catch {
          clone.output = { truncated: true };
        }
      }
      kept.push(clone as Json);
      continue;
    }

    if (type.startsWith('data-')) {
      kept.push(part as unknown as Json);
      continue;
    }
  }

  if (kept.length === 0) return null;

  try {
    if (JSON.stringify(kept).length > MAX_STORED_PARTS_BYTES) {
      const text = extractTextFromParts(kept as unknown[]);
      return text ? ([{ type: 'text', text }] as unknown as Json[]) : null;
    }
  } catch {
    return null;
  }

  return kept;
}

/**
 * Convert stored parts back into a model-safe UIMessage parts array: text plus
 * completed tool invocations (results and user-denied calls). Data parts and
 * incomplete tool calls are UI-only and are excluded from what the model sees.
 * With `keepPendingApprovals`, approval-requested parts survive too — the
 * agent-loop resume path grafts responses onto them and strips any that stay
 * unresolved before the prompt is built.
 */
export function partsForModel(
  parts: unknown[],
  options?: { keepPendingApprovals?: boolean }
): UIMessage['parts'] | null {
  const kept = parts.filter((part) => {
    if (!isRecord(part) || typeof part.type !== 'string') return false;
    if (part.type === 'text') return typeof part.text === 'string';
    if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
      return (
        part.state === 'output-available' ||
        part.state === 'output-denied' ||
        (options?.keepPendingApprovals === true &&
          part.state === 'approval-requested')
      );
    }
    return false;
  });
  return kept.length > 0 ? (kept as UIMessage['parts']) : null;
}

/**
 * Persist the latest user turn server-side (idempotent: skipped when the most
 * recent row already holds the same user text, e.g. on client retries).
 */
export async function persistBrunoUserTurn(
  supabase: Supabase,
  input: {
    userId: string;
    conversationId: string;
    text: string;
    messageId?: string;
    skipInsert?: boolean;
  }
): Promise<string | undefined> {
  const text = input.text.trim();
  if (!text) return undefined;

  if (input.skipInsert) {
    return input.messageId;
  }

  const { data: lastRows } = await supabase
    .from('bruno_messages')
    .select('id, message_type, content')
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const last = lastRows?.[0];
  if (last?.message_type === 'user' && last.content === text) {
    return last.id;
  }

  const turnKey =
    typeof input.messageId === 'string' && isValidUuid(input.messageId)
      ? input.messageId
      : crypto.randomUUID();

  const insertRow: Database['public']['Tables']['bruno_messages']['Insert'] = {
    user_id: input.userId,
    conversation_id: input.conversationId,
    message_type: 'user',
    content: text,
    turn_key: turnKey,
    variant_index: 0,
    is_active_variant: true,
  };

  if (typeof input.messageId === 'string' && isValidUuid(input.messageId)) {
    insertRow.id = input.messageId;
  }

  const { data: inserted, error } = await supabase
    .from('bruno_messages')
    .insert(insertRow)
    .select('id')
    .single();

  if (error) throw error;
  return inserted?.id;
}

/**
 * Persist the assistant response server-side with full parts, so proposals and
 * tool results survive reloads and future turns can be rebuilt faithfully.
 */
export async function persistBrunoAssistantTurn(
  supabase: Supabase,
  input: {
    userId: string;
    conversationId: string;
    message: Pick<UIMessage, 'parts'> & { id?: string };
    /**
     * When set, update this existing assistant row instead of inserting a new
     * one — used by approval continuations, where the SDK merges the resumed
     * turn into the original assistant message.
     */
    replaceRowId?: string;
    parentUserMessageId?: string;
  }
): Promise<void> {
  const parts = Array.isArray(input.message.parts) ? input.message.parts : [];
  const sanitized = sanitizeUiMessagePartsForStorage(parts);
  const text = extractTextFromParts(parts);

  if (!text && !sanitized) return;

  const content = text || '[Bruno performed actions without a text reply]';

  if (input.replaceRowId) {
    await supabase
      .from('bruno_messages')
      .update({ content, parts: sanitized as Json })
      .eq('id', input.replaceRowId)
      .eq('user_id', input.userId)
      .eq('conversation_id', input.conversationId);
    return;
  }

  const insertRow: Database['public']['Tables']['bruno_messages']['Insert'] = {
    user_id: input.userId,
    conversation_id: input.conversationId,
    message_type: 'assistant',
    content,
    parts: sanitized as Json,
  };

  if (typeof input.message.id === 'string' && isValidUuid(input.message.id)) {
    insertRow.id = input.message.id;
  }

  if (
    typeof input.parentUserMessageId === 'string' &&
    isValidUuid(input.parentUserMessageId)
  ) {
    insertRow.parent_user_message_id = input.parentUserMessageId;
  } else {
    const { data: activeUserRows } = await supabase
      .from('bruno_messages')
      .select('id')
      .eq('conversation_id', input.conversationId)
      .eq('user_id', input.userId)
      .eq('message_type', 'user')
      .eq('is_active_variant', true)
      .order('created_at', { ascending: false })
      .limit(1);
    const parentId = activeUserRows?.[0]?.id;
    if (parentId) {
      insertRow.parent_user_message_id = parentId;
    }
  }

  await supabase.from('bruno_messages').insert(insertRow);
}

/**
 * Server-authoritative chat history: assistant turns come from the database
 * (full parts when stored, text otherwise); client-supplied assistant/tool
 * messages are ignored to prevent prompt injection.
 */
export async function resolveAuthoritativeChatMessages(
  supabase: Supabase,
  userId: string,
  conversationId: string | undefined,
  clientMessages: ServerChatMessageInput[],
  options?: { keepPendingApprovals?: boolean }
): Promise<UIMessage[]> {
  const clientUserMessages = clientMessages
    .filter((message) => message.role === 'user')
    .map((message, index) => ({
      id: message.id ?? `client-user-${index}`,
      text: extractMessageText(message),
    }))
    .filter((message) => message.text.length > 0);

  const latestClientUser = clientUserMessages[clientUserMessages.length - 1];

  if (!conversationId) {
    return clientUserMessages.map((message) =>
      toUiMessage(message.id, 'user', message.text)
    );
  }

  const { data, error } = await supabase
    .from('bruno_messages')
    .select(
      'id, content, message_type, parts, created_at, turn_key, variant_index, is_active_variant, parent_user_message_id, superseded_at'
    )
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const branchTranscript = buildActiveBranchTranscript(
    (data ?? []) as BranchMessageRow[]
  );

  const serverMessages: UIMessage[] = branchTranscript.map((row) => {
    if (row.role === 'assistant' && Array.isArray(row.parts)) {
      const modelParts = partsForModel(row.parts as unknown[], options);
      if (modelParts) {
        return { id: row.id, role: row.role, parts: modelParts } satisfies UIMessage;
      }
    }
    const text =
      row.parts?.find((part) => part.type === 'text')?.text ?? '';
    return toUiMessage(row.id, row.role, text);
  });

  if (!latestClientUser) {
    return serverMessages;
  }

  const lastServer = serverMessages[serverMessages.length - 1];
  const alreadyPersisted =
    lastServer?.role === 'user' &&
    lastServer.parts?.find((part) => part.type === 'text')?.text ===
      latestClientUser.text;

  if (!alreadyPersisted) {
    serverMessages.push(
      toUiMessage(latestClientUser.id, 'user', latestClientUser.text)
    );
  }

  return serverMessages;
}
