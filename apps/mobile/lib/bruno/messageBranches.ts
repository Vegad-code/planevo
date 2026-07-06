import type { BrunoUIMessage } from './types';

export type BranchMessageRow = {
  id: string;
  content: string;
  message_type: string;
  parts: unknown[] | null;
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
  parts: BrunoUIMessage['parts'];
  createdAt: Date;
  turnKey?: string;
  variantIndex?: number;
};

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
      parts: row.parts as BrunoUIMessage['parts'],
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
