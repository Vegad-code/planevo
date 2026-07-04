import { describe, expect, it } from 'vitest';
import {
  buildActiveBranchTranscript,
  buildVariantInfoByMessageId,
  branchRowsToChatState,
  branchRowsToChatStateForVariant,
  type BranchMessageRow,
} from '@/lib/bruno/messageBranches';

function userRow(
  id: string,
  content: string,
  options: Partial<BranchMessageRow> = {}
): BranchMessageRow {
  return {
    id,
    content,
    message_type: 'user',
    parts: null,
    created_at: options.created_at ?? '2026-07-04T12:00:00.000Z',
    turn_key: options.turn_key ?? id,
    variant_index: options.variant_index ?? 0,
    is_active_variant: options.is_active_variant ?? true,
    parent_user_message_id: null,
    superseded_at: options.superseded_at ?? null,
  };
}

function assistantRow(
  id: string,
  content: string,
  parentUserMessageId: string,
  options: Partial<BranchMessageRow> = {}
): BranchMessageRow {
  return {
    id,
    content,
    message_type: 'assistant',
    parts: null,
    created_at: options.created_at ?? '2026-07-04T12:00:01.000Z',
    turn_key: null,
    variant_index: 0,
    is_active_variant: true,
    parent_user_message_id: parentUserMessageId,
    superseded_at: options.superseded_at ?? null,
  };
}

describe('buildActiveBranchTranscript', () => {
  it('returns one user and assistant pair for a single turn', () => {
    const rows = [
      userRow('user-1', 'hi', { created_at: '2026-07-04T12:00:00.000Z' }),
      assistantRow('asst-1', 'Hello!', 'user-1', {
        created_at: '2026-07-04T12:00:01.000Z',
      }),
    ];

    const transcript = buildActiveBranchTranscript(rows);
    expect(transcript).toHaveLength(2);
    expect(transcript[0].role).toBe('user');
    expect(transcript[1].role).toBe('assistant');
  });

  it('shows only the active variant when multiple user variants exist', () => {
    const turnKey = 'turn-1';
    const rows = [
      userRow('user-v0', 'hi', {
        turn_key: turnKey,
        variant_index: 0,
        is_active_variant: false,
        created_at: '2026-07-04T12:00:00.000Z',
      }),
      assistantRow('asst-v0', 'Hi there', 'user-v0', {
        created_at: '2026-07-04T12:00:01.000Z',
      }),
      userRow('user-v1', 'hello', {
        turn_key: turnKey,
        variant_index: 1,
        is_active_variant: true,
        created_at: '2026-07-04T12:00:02.000Z',
      }),
      assistantRow('asst-v1', 'Hello!', 'user-v1', {
        created_at: '2026-07-04T12:00:03.000Z',
      }),
    ];

    const transcript = buildActiveBranchTranscript(rows);
    expect(transcript).toHaveLength(2);
    expect(transcript[0].id).toBe('user-v1');
    expect(transcript[0].parts?.[0]).toEqual({ type: 'text', text: 'hello' });
    expect(transcript[1].id).toBe('asst-v1');
  });

  it('shows archived assistant when switching to an older user variant', () => {
    const turnKey = 'turn-1';
    const rows = [
      userRow('user-v0', 'hi', {
        turn_key: turnKey,
        variant_index: 0,
        is_active_variant: true,
        created_at: '2026-07-04T12:00:00.000Z',
      }),
      assistantRow('asst-v0', 'Hi there', 'user-v0', {
        created_at: '2026-07-04T12:00:01.000Z',
        superseded_at: '2026-07-04T12:00:05.000Z',
      }),
      userRow('user-v1', 'hello', {
        turn_key: turnKey,
        variant_index: 1,
        is_active_variant: false,
        created_at: '2026-07-04T12:00:02.000Z',
      }),
      assistantRow('asst-v1', 'Hello!', 'user-v1', {
        created_at: '2026-07-04T12:00:03.000Z',
      }),
    ];

    const transcript = buildActiveBranchTranscript(rows);
    expect(transcript).toHaveLength(2);
    expect(transcript[0].id).toBe('user-v0');
    expect(transcript[1].id).toBe('asst-v0');
    expect(transcript[1].parts?.[0]).toEqual({
      type: 'text',
      text: 'Hi there',
    });
  });

  it('prefers the non-superseded assistant when multiple are linked to the same user row', () => {
    const turnKey = 'turn-1';
    const rows = [
      userRow('user-1', 'hi', {
        turn_key: turnKey,
        variant_index: 1,
        is_active_variant: true,
        created_at: '2026-07-04T12:00:00.000Z',
      }),
      assistantRow('asst-old', 'Old reply', 'user-1', {
        created_at: '2026-07-04T12:00:01.000Z',
        superseded_at: '2026-07-04T12:00:05.000Z',
      }),
      assistantRow('asst-new', 'New reply', 'user-1', {
        created_at: '2026-07-04T12:00:06.000Z',
      }),
    ];

    const transcript = buildActiveBranchTranscript(rows);
    expect(transcript).toHaveLength(2);
    expect(transcript[1].id).toBe('asst-new');
  });

  it('uses a superseded sibling assistant when an archived variant has no direct link', () => {
    const turnKey = 'turn-1';
    const rows = [
      userRow('user-v0', 'hi', {
        turn_key: turnKey,
        variant_index: 0,
        is_active_variant: true,
        created_at: '2026-07-04T12:00:02.000Z',
      }),
      userRow('user-v1', 'hello', {
        turn_key: turnKey,
        variant_index: 1,
        is_active_variant: false,
        created_at: '2026-07-04T12:00:00.000Z',
      }),
      assistantRow('asst-v0', 'Hi there', 'user-v1', {
        created_at: '2026-07-04T12:00:01.000Z',
        superseded_at: '2026-07-04T12:00:05.000Z',
      }),
      assistantRow('asst-v1', 'Hello!', 'user-v1', {
        created_at: '2026-07-04T12:00:06.000Z',
      }),
    ];

    const transcript = buildActiveBranchTranscript(rows);
    expect(transcript).toHaveLength(2);
    expect(transcript[0].id).toBe('user-v0');
    expect(transcript[1].id).toBe('asst-v0');
  });

  it('shows only the active variant assistant after sibling assistants are superseded', () => {
    const turnKey = 'turn-1';
    const rows = [
      userRow('user-v0', 'hi', {
        turn_key: turnKey,
        variant_index: 0,
        is_active_variant: true,
        created_at: '2026-07-04T12:00:00.000Z',
      }),
      assistantRow('asst-v0', 'Hi there', 'user-v0', {
        created_at: '2026-07-04T12:00:01.000Z',
      }),
      userRow('user-v1', 'hello', {
        turn_key: turnKey,
        variant_index: 1,
        is_active_variant: false,
        created_at: '2026-07-04T12:00:02.000Z',
      }),
      assistantRow('asst-v1', 'Hello!', 'user-v1', {
        created_at: '2026-07-04T12:00:03.000Z',
        superseded_at: '2026-07-04T12:00:05.000Z',
      }),
    ];

    const transcript = buildActiveBranchTranscript(rows);
    expect(transcript).toHaveLength(2);
    expect(transcript[0].id).toBe('user-v0');
    expect(transcript[1].id).toBe('asst-v0');
  });

  it('excludes superseded downstream turns', () => {
    const rows = [
      userRow('user-1', 'first', {
        turn_key: 'turn-1',
        created_at: '2026-07-04T12:00:00.000Z',
      }),
      assistantRow('asst-1', 'Reply 1', 'user-1', {
        created_at: '2026-07-04T12:00:01.000Z',
      }),
      userRow('user-2', 'second', {
        turn_key: 'turn-2',
        created_at: '2026-07-04T12:00:02.000Z',
        superseded_at: '2026-07-04T12:00:05.000Z',
      }),
      assistantRow('asst-2', 'Reply 2', 'user-2', {
        created_at: '2026-07-04T12:00:03.000Z',
        superseded_at: '2026-07-04T12:00:05.000Z',
      }),
    ];

    const transcript = buildActiveBranchTranscript(rows);
    expect(transcript).toHaveLength(2);
    expect(transcript[0].id).toBe('user-1');
  });
});

describe('buildVariantInfoByMessageId', () => {
  it('maps active user messages with multiple variants', () => {
    const turnKey = 'turn-1';
    const rows = [
      userRow('user-v0', 'hi', {
        turn_key: turnKey,
        variant_index: 0,
        is_active_variant: false,
      }),
      userRow('user-v1', 'hello', {
        turn_key: turnKey,
        variant_index: 1,
        is_active_variant: true,
      }),
    ];
    const transcript = buildActiveBranchTranscript(rows);

    const info = buildVariantInfoByMessageId(rows, transcript);
    expect(info['user-v1']).toEqual({
      turnKey,
      activeIndex: 1,
      totalVariants: 2,
    });
  });
});

describe('branchRowsToChatStateForVariant', () => {
  it('switches variants locally without waiting on the network', () => {
    const turnKey = 'turn-1';
    const rows = [
      userRow('user-v0', 'hi', {
        turn_key: turnKey,
        variant_index: 0,
        is_active_variant: false,
        created_at: '2026-07-04T12:00:00.000Z',
      }),
      assistantRow('asst-v0', 'Hi there', 'user-v0', {
        created_at: '2026-07-04T12:00:01.000Z',
      }),
      userRow('user-v1', 'hello', {
        turn_key: turnKey,
        variant_index: 1,
        is_active_variant: true,
        created_at: '2026-07-04T12:00:02.000Z',
      }),
      assistantRow('asst-v1', 'Hello!', 'user-v1', {
        created_at: '2026-07-04T12:00:03.000Z',
      }),
    ];

    const active = branchRowsToChatState(rows);
    expect(active.messages[0].parts?.[0]).toEqual({
      type: 'text',
      text: 'hello',
    });

    const switched = branchRowsToChatStateForVariant(rows, turnKey, 0);
    expect(switched.messages[0].parts?.[0]).toEqual({
      type: 'text',
      text: 'hi',
    });
    expect(switched.messages[1].parts?.[0]).toEqual({
      type: 'text',
      text: 'Hi there',
    });
    expect(switched.variantInfoByMessageId['user-v0']?.activeIndex).toBe(0);
  });
});
