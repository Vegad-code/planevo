import type { UIMessage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';

type Supabase = SupabaseClient<Database>;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BranchMessageRow = {
  id: string;
  content: string;
  message_type: string;
  parts: Json | null;
  created_at: string;
  turn_key: string | null;
  variant_index: number | null;
  is_active_variant: boolean | null;
  parent_user_message_id: string | null;
  superseded_at: string | null;
};

export type BrunoVariantInfo = {
  turnKey: string;
  activeIndex: number;
  totalVariants: number;
};

export type HydratedBrunoMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: UIMessage['parts'];
  createdAt: Date;
  turnKey?: string;
  variantIndex?: number;
};

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function effectiveTurnKey(row: BranchMessageRow): string | null {
  if (row.message_type !== 'user') return null;
  return row.turn_key ?? row.id;
}

function rowToUiMessage(row: BranchMessageRow): HydratedBrunoMessage {
  const role = row.message_type === 'user' ? 'user' : 'assistant';
  if (
    role === 'assistant' &&
    Array.isArray(row.parts) &&
    row.parts.length > 0
  ) {
    return {
      id: row.id,
      role,
      parts: row.parts as UIMessage['parts'],
      createdAt: new Date(row.created_at),
    };
  }
  return {
    id: row.id,
    role,
    parts: [{ type: 'text', text: row.content }],
    createdAt: new Date(row.created_at),
    ...(role === 'user'
      ? {
          turnKey: effectiveTurnKey(row) ?? undefined,
          variantIndex: row.variant_index ?? 0,
        }
      : {}),
  };
}

function findAssistantForUser(
  rows: BranchMessageRow[],
  userRow: BranchMessageRow
): BranchMessageRow | null {
  const linkedCandidates = rows.filter(
    (row) =>
      row.message_type === 'assistant' &&
      row.parent_user_message_id === userRow.id
  );
  if (linkedCandidates.length > 0) {
    const sortedCandidates = [...linkedCandidates].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );
    const activeCandidates = sortedCandidates.filter(
      (row) => !row.superseded_at
    );
    return activeCandidates.at(-1) ?? sortedCandidates.at(-1)!;
  }

  const turnKey = effectiveTurnKey(userRow);
  if (turnKey) {
    const siblingUsers = rows.filter(
      (row) =>
        row.message_type === 'user' &&
        row.id !== userRow.id &&
        effectiveTurnKey(row) === turnKey
    );
    const siblingIds = new Set(siblingUsers.map((row) => row.id));
    const supersededSiblingAssistants = rows
      .filter(
        (row) =>
          row.message_type === 'assistant' &&
          row.parent_user_message_id &&
          siblingIds.has(row.parent_user_message_id) &&
          row.superseded_at
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    if (supersededSiblingAssistants.length > 0) {
      const variantIndex = userRow.variant_index ?? 0;
      return (
        supersededSiblingAssistants[variantIndex] ??
        supersededSiblingAssistants[0]
      );
    }
  }

  const sorted = [...rows].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const userIndex = sorted.findIndex((row) => row.id === userRow.id);
  if (userIndex === -1) return null;

  for (let i = userIndex + 1; i < sorted.length; i++) {
    const row = sorted[i];
    if (row.message_type === 'user') break;
    if (row.message_type === 'assistant' && !row.superseded_at) return row;
  }
  return null;
}

/**
 * Build the linear active-branch transcript for display and model context.
 */
export function buildActiveBranchTranscript(
  rows: BranchMessageRow[]
): HydratedBrunoMessage[] {
  const visible = rows.filter((row) => !row.superseded_at);
  const userRows = visible.filter((row) => row.message_type === 'user');

  const turnKeysInOrder: string[] = [];
  for (const row of [...userRows].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  )) {
    const turnKey = effectiveTurnKey(row);
    if (turnKey && !turnKeysInOrder.includes(turnKey)) {
      turnKeysInOrder.push(turnKey);
    }
  }

  const transcript: HydratedBrunoMessage[] = [];

  for (const turnKey of turnKeysInOrder) {
    const variants = userRows.filter(
      (row) => effectiveTurnKey(row) === turnKey
    );
    const activeUser =
      variants.find((row) => row.is_active_variant) ??
      variants[variants.length - 1];
    if (!activeUser) continue;

    transcript.push(rowToUiMessage(activeUser));

    const assistant = findAssistantForUser(rows, activeUser);
    if (assistant) {
      transcript.push(rowToUiMessage(assistant));
    }
  }

  return transcript;
}

export function buildVariantInfoByMessageId(
  rows: BranchMessageRow[],
  transcript: HydratedBrunoMessage[]
): Record<string, BrunoVariantInfo> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.message_type !== 'user') continue;
    const turnKey = effectiveTurnKey(row);
    if (!turnKey) continue;
    counts.set(turnKey, (counts.get(turnKey) ?? 0) + 1);
  }

  const info: Record<string, BrunoVariantInfo> = {};
  for (const message of transcript) {
    if (message.role !== 'user' || !message.turnKey) continue;
    const totalVariants = counts.get(message.turnKey) ?? 1;
    if (totalVariants <= 1) continue;
    info[message.id] = {
      turnKey: message.turnKey,
      activeIndex: message.variantIndex ?? 0,
      totalVariants,
    };
  }
  return info;
}

async function supersedeDownstreamFrom(
  supabase: Supabase,
  input: {
    userId: string;
    conversationId: string;
    fromCreatedAt: string;
    turnKey: string;
  }
): Promise<void> {
  const now = new Date().toISOString();

  const { data: downstream } = await supabase
    .from('bruno_messages')
    .select('id, message_type, turn_key, created_at')
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .gt('created_at', input.fromCreatedAt)
    .is('superseded_at', null);

  const idsToSupersede = (downstream ?? [])
    .filter((row) => {
      if (row.message_type === 'user' && row.turn_key === input.turnKey) {
        return false;
      }
      return true;
    })
    .map((row) => row.id);

  if (idsToSupersede.length === 0) return;

  const { error } = await supabase
    .from('bruno_messages')
    .update({ superseded_at: now })
    .in('id', idsToSupersede);

  if (error) throw error;
}

async function unsupersedeDownstreamFrom(
  supabase: Supabase,
  input: {
    userId: string;
    conversationId: string;
    fromCreatedAt: string;
    turnKey: string;
  }
): Promise<void> {
  const { data: superseded } = await supabase
    .from('bruno_messages')
    .select('id, message_type, turn_key, created_at')
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .gt('created_at', input.fromCreatedAt)
    .not('superseded_at', 'is', null);

  const idsToRestore = (superseded ?? [])
    .filter((row) => {
      if (row.message_type === 'user' && row.turn_key === input.turnKey) {
        return false;
      }
      return true;
    })
    .map((row) => row.id);

  if (idsToRestore.length === 0) return;

  const { error } = await supabase
    .from('bruno_messages')
    .update({ superseded_at: null })
    .in('id', idsToRestore);

  if (error) throw error;
}

async function findAssistantToArchive(
  supabase: Supabase,
  input: {
    userId: string;
    conversationId: string;
    userMessageId: string;
    userCreatedAt: string;
  }
): Promise<{ content: string; parts: Json | null } | null> {
  const { data: linkedAssistants } = await supabase
    .from('bruno_messages')
    .select('content, parts')
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .eq('parent_user_message_id', input.userMessageId)
    .eq('message_type', 'assistant')
    .order('created_at', { ascending: false })
    .limit(1);

  if (linkedAssistants?.[0]) return linkedAssistants[0];

  const { data: followingRows } = await supabase
    .from('bruno_messages')
    .select('content, parts, message_type, created_at')
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .gt('created_at', input.userCreatedAt)
    .order('created_at', { ascending: true })
    .limit(5);

  const positional = followingRows?.find(
    (row) => row.message_type === 'assistant'
  );
  if (!positional) return null;

  return { content: positional.content, parts: positional.parts as Json | null };
}

/**
 * Archive the active branch from a user message onward (edit path).
 * Keeps inactive sibling variants; supersedes downstream turns on the active branch.
 */
export async function archiveActiveBranchFromUserMessage(
  supabase: Supabase,
  input: {
    userId: string;
    conversationId: string;
    userMessageId: string;
  }
): Promise<{ turnKey: string; userRow: BranchMessageRow } | null> {
  const { data: row, error } = await supabase
    .from('bruno_messages')
    .select(
      'id, content, message_type, parts, created_at, turn_key, variant_index, is_active_variant, parent_user_message_id, superseded_at'
    )
    .eq('id', input.userMessageId)
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .eq('message_type', 'user')
    .maybeSingle();

  if (error) throw error;
  if (!row) return null;

  const turnKey = row.turn_key ?? row.id;

  await supersedeDownstreamFrom(supabase, {
    userId: input.userId,
    conversationId: input.conversationId,
    fromCreatedAt: row.created_at,
    turnKey,
  });

  const now = new Date().toISOString();
  await supabase
    .from('bruno_messages')
    .update({ superseded_at: now })
    .eq('parent_user_message_id', row.id)
    .is('superseded_at', null);

  return { turnKey, userRow: row as BranchMessageRow };
}

/**
 * Record a new edit variant in-place on the stable client message id.
 */
export async function createUserVariant(
  supabase: Supabase,
  input: {
    userId: string;
    conversationId: string;
    userMessageId: string;
    turnKey: string;
    previousContent: string;
    previousVariantIndex: number;
    newText: string;
  }
): Promise<void> {
  const text = input.newText.trim();
  if (!text) return;

  const { data: maxRows } = await supabase
    .from('bruno_messages')
    .select('variant_index')
    .eq('conversation_id', input.conversationId)
    .eq('turn_key', input.turnKey)
    .eq('message_type', 'user')
    .order('variant_index', { ascending: false })
    .limit(1);

  const maxVariant = maxRows?.[0]?.variant_index ?? input.previousVariantIndex;
  const nextVariant = maxVariant + 1;

  const { data: activeUserRow } = await supabase
    .from('bruno_messages')
    .select('created_at')
    .eq('id', input.userMessageId)
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .maybeSingle();

  const assistant = activeUserRow
    ? await findAssistantToArchive(supabase, {
        userId: input.userId,
        conversationId: input.conversationId,
        userMessageId: input.userMessageId,
        userCreatedAt: activeUserRow.created_at,
      })
    : null;

  const { data: archiveUser, error: archiveError } = await supabase
    .from('bruno_messages')
    .insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      message_type: 'user',
      content: input.previousContent,
      turn_key: input.turnKey,
      variant_index: input.previousVariantIndex,
      is_active_variant: false,
    })
    .select('id')
    .single();

  if (archiveError) throw archiveError;

  if (archiveUser?.id && assistant) {
    await supabase.from('bruno_messages').insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      message_type: 'assistant',
      content: assistant.content,
      parts: assistant.parts,
      parent_user_message_id: archiveUser.id,
    });
  }

  await supabase
    .from('bruno_messages')
    .update({
      content: text,
      variant_index: nextVariant,
      is_active_variant: true,
      turn_key: input.turnKey,
    })
    .eq('id', input.userMessageId)
    .eq('user_id', input.userId)
    .eq('conversation_id', input.conversationId);
}

export async function handleUserMessageEdit(
  supabase: Supabase,
  input: {
    userId: string;
    conversationId: string;
    editMessageId: string;
    newText: string;
  }
): Promise<void> {
  const archived = await archiveActiveBranchFromUserMessage(supabase, {
    userId: input.userId,
    conversationId: input.conversationId,
    userMessageId: input.editMessageId,
  });
  if (!archived) return;

  const { userRow, turnKey } = archived;
  const trimmed = input.newText.trim();
  if (!trimmed || trimmed === userRow.content.trim()) return;

  await createUserVariant(supabase, {
    userId: input.userId,
    conversationId: input.conversationId,
    userMessageId: input.editMessageId,
    turnKey,
    previousContent: userRow.content,
    previousVariantIndex: userRow.variant_index ?? 0,
    newText: trimmed,
  });
}

export async function activateUserVariant(
  supabase: Supabase,
  input: {
    userId: string;
    conversationId: string;
    turnKey: string;
    variantIndex: number;
  }
): Promise<BranchMessageRow[]> {
  const { data: variants, error: variantsError } = await supabase
    .from('bruno_messages')
    .select(
      'id, content, message_type, parts, created_at, turn_key, variant_index, is_active_variant, parent_user_message_id, superseded_at'
    )
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .eq('turn_key', input.turnKey)
    .eq('message_type', 'user')
    .order('variant_index', { ascending: true });

  if (variantsError) throw variantsError;
  if (!variants?.length) return [];

  const target = variants.find(
    (row) => row.variant_index === input.variantIndex
  );
  if (!target) {
    throw new Error('Variant not found');
  }

  const previouslyActive =
    variants.find((row) => row.is_active_variant) ?? variants[variants.length - 1];

  const now = new Date().toISOString();
  const otherVariantUserIds = variants
    .filter((row) => row.id !== target.id)
    .map((row) => row.id);

  const { error: deactivateError } = await supabase
    .from('bruno_messages')
    .update({ is_active_variant: false })
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .eq('turn_key', input.turnKey)
    .eq('message_type', 'user');

  if (deactivateError) throw deactivateError;

  const { error: activateError } = await supabase
    .from('bruno_messages')
    .update({ is_active_variant: true })
    .eq('id', target.id);

  if (activateError) throw activateError;

  const assistantUpdateResults = await Promise.all([
    otherVariantUserIds.length > 0
      ? supabase
          .from('bruno_messages')
          .update({ superseded_at: now })
          .eq('conversation_id', input.conversationId)
          .eq('user_id', input.userId)
          .eq('message_type', 'assistant')
          .in('parent_user_message_id', otherVariantUserIds)
      : Promise.resolve({ error: null }),
    supabase
      .from('bruno_messages')
      .update({ superseded_at: null })
      .eq('conversation_id', input.conversationId)
      .eq('user_id', input.userId)
      .eq('message_type', 'assistant')
      .eq('parent_user_message_id', target.id),
    otherVariantUserIds.length > 0
      ? supabase
          .from('bruno_messages')
          .select('id, created_at')
          .eq('conversation_id', input.conversationId)
          .eq('user_id', input.userId)
          .eq('message_type', 'assistant')
          .in('parent_user_message_id', otherVariantUserIds)
          .not('superseded_at', 'is', null)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of assistantUpdateResults) {
    if (result.error) throw result.error;
  }

  const supersededSiblingAssistants =
    assistantUpdateResults[2].data ?? [];

  const { data: targetAssistants, error: targetAssistantsError } =
    await supabase
      .from('bruno_messages')
      .select('id')
      .eq('conversation_id', input.conversationId)
      .eq('user_id', input.userId)
      .eq('message_type', 'assistant')
      .eq('parent_user_message_id', target.id)
      .limit(1);

  if (targetAssistantsError) throw targetAssistantsError;

  if (!targetAssistants?.length && supersededSiblingAssistants.length > 0) {
    const variantIndex = target.variant_index ?? 0;
    const orphanAssistant =
      supersededSiblingAssistants[variantIndex] ??
      supersededSiblingAssistants[0];

    if (orphanAssistant) {
      const { error: adoptAssistantError } = await supabase
        .from('bruno_messages')
        .update({
          parent_user_message_id: target.id,
          superseded_at: null,
        })
        .eq('id', orphanAssistant.id);

      if (adoptAssistantError) throw adoptAssistantError;
    }
  }

  if (
    previouslyActive &&
    previouslyActive.id !== target.id &&
    (previouslyActive.variant_index ?? 0) > (target.variant_index ?? 0)
  ) {
    await supersedeDownstreamFrom(supabase, {
      userId: input.userId,
      conversationId: input.conversationId,
      fromCreatedAt: previouslyActive.created_at,
      turnKey: input.turnKey,
    });
  } else if (
    previouslyActive &&
    previouslyActive.id !== target.id &&
    (target.variant_index ?? 0) > (previouslyActive.variant_index ?? 0)
  ) {
    await unsupersedeDownstreamFrom(supabase, {
      userId: input.userId,
      conversationId: input.conversationId,
      fromCreatedAt: target.created_at,
      turnKey: input.turnKey,
    });
  }

  const { data: allRows, error: allError } = await supabase
    .from('bruno_messages')
    .select(
      'id, content, message_type, parts, created_at, turn_key, variant_index, is_active_variant, parent_user_message_id, superseded_at'
    )
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .order('created_at', { ascending: true });

  if (allError) throw allError;
  return (allRows ?? []) as BranchMessageRow[];
}

export async function fetchConversationBranchRows(
  supabase: Supabase,
  input: { userId: string; conversationId: string }
): Promise<BranchMessageRow[]> {
  const { data, error } = await supabase
    .from('bruno_messages')
    .select(
      'id, content, message_type, parts, created_at, turn_key, variant_index, is_active_variant, parent_user_message_id, superseded_at'
    )
    .eq('conversation_id', input.conversationId)
    .eq('user_id', input.userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as BranchMessageRow[];
}

export function branchRowsToChatState(rows: BranchMessageRow[]): {
  messages: HydratedBrunoMessage[];
  variantInfoByMessageId: Record<string, BrunoVariantInfo>;
} {
  const messages = buildActiveBranchTranscript(rows);
  return {
    messages,
    variantInfoByMessageId: buildVariantInfoByMessageId(rows, messages),
  };
}

function cloneBranchRows(rows: BranchMessageRow[]): BranchMessageRow[] {
  return rows.map((row) => ({ ...row }));
}

/**
 * Pure client-side variant switch — mirrors activateUserVariant enough for
 * instant ChatGPT-style version navigation without waiting on the network.
 */
export function applyVariantSelectionToRows(
  rows: BranchMessageRow[],
  selection: { turnKey: string; variantIndex: number }
): BranchMessageRow[] {
  const simulated = cloneBranchRows(rows);
  const turnVariants = simulated.filter(
    (row) =>
      row.message_type === 'user' &&
      effectiveTurnKey(row) === selection.turnKey
  );

  const target = turnVariants.find(
    (row) => row.variant_index === selection.variantIndex
  );
  if (!target) return simulated;

  const previouslyActive =
    turnVariants.find((row) => row.is_active_variant) ??
    turnVariants[turnVariants.length - 1];
  const otherVariantUserIds = new Set(
    turnVariants.filter((row) => row.id !== target.id).map((row) => row.id)
  );
  const now = new Date().toISOString();

  for (const row of simulated) {
    if (
      row.message_type === 'user' &&
      effectiveTurnKey(row) === selection.turnKey
    ) {
      row.is_active_variant = row.id === target.id;
    }
  }

  for (const row of simulated) {
    if (row.message_type !== 'assistant' || !row.parent_user_message_id) {
      continue;
    }
    if (otherVariantUserIds.has(row.parent_user_message_id)) {
      row.superseded_at = now;
    }
    if (row.parent_user_message_id === target.id) {
      row.superseded_at = null;
    }
  }

  if (
    previouslyActive &&
    previouslyActive.id !== target.id &&
    (previouslyActive.variant_index ?? 0) > (target.variant_index ?? 0)
  ) {
    for (const row of simulated) {
      if (row.superseded_at) continue;
      if (row.created_at <= previouslyActive.created_at) continue;
      if (row.message_type === 'user' && row.turn_key === selection.turnKey) {
        continue;
      }
      row.superseded_at = now;
    }
  } else if (
    previouslyActive &&
    previouslyActive.id !== target.id &&
    (target.variant_index ?? 0) > (previouslyActive.variant_index ?? 0)
  ) {
    for (const row of simulated) {
      if (!row.superseded_at) continue;
      if (row.created_at <= target.created_at) continue;
      if (row.message_type === 'user' && row.turn_key === selection.turnKey) {
        continue;
      }
      row.superseded_at = null;
    }
  }

  return simulated;
}

export function branchRowsToChatStateForVariant(
  rows: BranchMessageRow[],
  turnKey: string,
  variantIndex: number
): {
  rows: BranchMessageRow[];
  messages: HydratedBrunoMessage[];
  variantInfoByMessageId: Record<string, BrunoVariantInfo>;
} {
  const nextRows = applyVariantSelectionToRows(rows, { turnKey, variantIndex });
  const { messages, variantInfoByMessageId } = branchRowsToChatState(nextRows);
  return { rows: nextRows, messages, variantInfoByMessageId };
}

export function resolveClientMessageId(
  messages: Array<{ id?: string; role?: string; content?: unknown; parts?: unknown }>
): string | undefined {
  const userMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!userMessage?.id || !isValidUuid(userMessage.id)) return undefined;
  return userMessage.id;
}
