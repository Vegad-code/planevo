import { supabaseAdmin } from '@/lib/supabase/admin';
import { executeComposioTool, getActiveProProviders, type ComposioToolResult } from './client';
import {
  executeComposioToolAttempts,
  extractProviderRecords,
  NOTION_DATABASE_QUERY_ATTEMPTS,
  NOTION_WORKSPACE_SEARCH_ATTEMPTS,
  PROVIDER_SYNC_ATTEMPTS,
  SLACK_SYNC_ATTEMPTS,
} from './providerTools';
import { parseComposioPayload } from './composioPayload';
import { upsertIntegrationAccount, getIntegrationAccount } from '@/lib/integrations/accounts';
import {
  parseLinearPreferences,
  parseSlackPreferences,
} from './preferences';
import type { ProIntegrationProvider, SyncResult } from '@/lib/integrations/types';

/**
 * Composio sync engine.
 *
 * Pulls work items from connected Notion / Slack / Linear accounts and mirrors
 * them into `source_items`, following the same lifecycle pattern as the Google
 * Calendar sync (sync run rows, `last_synced_at`, stale-item soft delete).
 *
 * Composio occasionally renames toolkit actions, so each provider probes a
 * prioritized list of candidate tool slugs and uses the first that succeeds.
 */

const DONE_STATUSES = new Set([
  'done',
  'completed',
  'complete',
  'closed',
  'cancelled',
  'canceled',
  'archived',
]);

export interface NormalizedSourceItem {
  external_id: string;
  item_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  url: string | null;
  status: string | null;
  priority: string | null;
  completed: boolean;
  assignees: unknown[];
  raw_data: Record<string, unknown>;
}

/**
 * Pulls an array of records out of a Composio tool response. Tool payloads vary
 * by toolkit, so we probe the common container keys before giving up.
 */
export function extractItemsArray(
  data: Record<string, unknown>
): Record<string, unknown>[] {
  const parsed = parseComposioPayload(data);
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];

  const candidateKeys = [
    'issues',
    'results',
    'items',
    'nodes',
    'messages',
    'matches',
    'pages',
    'data',
    'records',
    'rows',
  ];

  const root = parsed as Record<string, unknown>;
  const messages = root.messages;
  if (messages && typeof messages === 'object' && !Array.isArray(messages)) {
    const matches = (messages as Record<string, unknown>).matches;
    if (Array.isArray(matches)) return matches as Record<string, unknown>[];
  }

  for (const key of candidateKeys) {
    const value = root[key];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (value && typeof value === 'object') {
      const nested = extractItemsArray(value as Record<string, unknown>);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function isDoneStatus(status: string | null): boolean {
  if (!status) return false;
  return DONE_STATUSES.has(status.trim().toLowerCase());
}

const LINEAR_PRIORITY: Record<number, string> = {
  0: 'low',
  1: 'urgent',
  2: 'high',
  3: 'medium',
  4: 'low',
};

export function mapLinearIssue(
  issue: Record<string, unknown>
): NormalizedSourceItem | null {
  const externalId = asString(issue.id) ?? asString(issue.identifier);
  const title = asString(issue.title);
  if (!externalId || !title) return null;

  const stateRaw = issue.state;
  const stateName =
    typeof stateRaw === 'object' && stateRaw !== null
      ? asString((stateRaw as Record<string, unknown>).name)
      : asString(stateRaw);
  const stateType =
    typeof stateRaw === 'object' && stateRaw !== null
      ? asString((stateRaw as Record<string, unknown>).type)
      : null;

  const priorityNum = typeof issue.priority === 'number' ? issue.priority : null;
  const completed =
    stateType === 'completed' ||
    stateType === 'canceled' ||
    isDoneStatus(stateName);

  return {
    external_id: externalId,
    item_type: 'issue',
    title,
    description: asString(issue.description),
    due_date: asString(issue.dueDate),
    url: asString(issue.url),
    status: stateName,
    priority: priorityNum !== null ? LINEAR_PRIORITY[priorityNum] ?? 'medium' : null,
    completed,
    assignees: issue.assignee ? [issue.assignee] : [],
    raw_data: issue,
  };
}

export function mapNotionPage(
  page: Record<string, unknown>
): NormalizedSourceItem | null {
  const externalId = asString(page.id);
  if (!externalId) return null;

  const properties = (page.properties ?? {}) as Record<string, unknown>;

  let title: string | null = null;
  let dueDate: string | null = null;
  let status: string | null = null;

  for (const prop of Object.values(properties)) {
    if (!prop || typeof prop !== 'object') continue;
    const p = prop as Record<string, unknown>;
    if (!title && p.type === 'title' && Array.isArray(p.title)) {
      title = (p.title as Array<Record<string, unknown>>)
        .map((t) => asString(t.plain_text) ?? '')
        .join('');
    }
    if (!dueDate && p.type === 'date' && p.date && typeof p.date === 'object') {
      dueDate = asString((p.date as Record<string, unknown>).start);
    }
    if (!status && p.type === 'status' && p.status && typeof p.status === 'object') {
      status = asString((p.status as Record<string, unknown>).name);
    }
    if (!status && p.type === 'select' && p.select && typeof p.select === 'object') {
      status = asString((p.select as Record<string, unknown>).name);
    }
  }

  return {
    external_id: externalId,
    item_type: 'assignment',
    title: title || asString(page.title) || 'Untitled',
    description: null,
    due_date: dueDate,
    url: asString(page.url),
    status,
    priority: null,
    completed: isDoneStatus(status),
    assignees: [],
    raw_data: page,
  };
}

export function mapSlackItem(
  item: Record<string, unknown>
): NormalizedSourceItem | null {
  const externalId =
    asString(item.ts) ?? asString(item.id) ?? asString(item.message_ts);
  if (!externalId) return null;

  const text =
    asString(item.text) ??
    asString(item.title) ??
    asString((item.message as Record<string, unknown>)?.text) ??
    'Slack item';

  return {
    external_id: externalId,
    item_type: 'message',
    title: text.length > 140 ? `${text.slice(0, 137)}...` : text,
    description: null,
    due_date: null,
    url: asString(item.permalink) ?? asString(item.url),
    status: null,
    priority: null,
    completed: false,
    assignees: [],
    raw_data: item,
  };
}

function mapItemsForProvider(
  provider: ProIntegrationProvider,
  rawItems: Record<string, unknown>[]
): NormalizedSourceItem[] {
  const mapper =
    provider === 'linear'
      ? mapLinearIssue
      : provider === 'notion'
        ? mapNotionPage
        : mapSlackItem;

  return rawItems
    .map((item) => mapper(item))
    .filter((item): item is NormalizedSourceItem => item !== null);
}

function linearIssueTeamId(issue: Record<string, unknown>): string | null {
  const team = issue.team;
  if (typeof team === 'object' && team !== null) {
    const id = (team as Record<string, unknown>).id;
    return typeof id === 'string' ? id : null;
  }
  const teamId = issue.teamId;
  return typeof teamId === 'string' ? teamId : null;
}

function linearIssueCompleted(issue: Record<string, unknown>): boolean {
  const stateRaw = issue.state;
  const stateName =
    typeof stateRaw === 'object' && stateRaw !== null
      ? asString((stateRaw as Record<string, unknown>).name)
      : asString(stateRaw);
  const stateType =
    typeof stateRaw === 'object' && stateRaw !== null
      ? asString((stateRaw as Record<string, unknown>).type)
      : null;
  return (
    stateType === 'completed' ||
    stateType === 'canceled' ||
    isDoneStatus(stateName)
  );
}

async function fetchSlackItems(
  userId: string,
  metadata: Record<string, unknown> | null | undefined
): Promise<{ items: Record<string, unknown>[]; result: ComposioToolResult }> {
  const prefs = parseSlackPreferences(metadata);
  const all: Record<string, unknown>[] = [];
  let lastResult: ComposioToolResult = { successful: true, error: null, data: {} };

  if (prefs.configured) {
    for (const channelId of prefs.channel_ids.slice(0, 15)) {
      const result = await executeComposioTool(userId, 'SLACK_FETCH_CONVERSATION_HISTORY', {
        channel: channelId,
        limit: 50,
      });
      lastResult = result;
      if (result.successful) {
        const messages = extractItemsArray(result.data);
        all.push(
          ...messages.map((message) => ({
            ...message,
            channel_id: channelId,
          }))
        );
      }
    }
  } else {
    const result = await executeComposioToolAttempts(userId, SLACK_SYNC_ATTEMPTS);
    lastResult = result;
    if (result.successful) {
      all.push(...extractProviderRecords('slack', result.data));
    }
  }

  if (prefs.include_starred) {
    const starred = await executeComposioTool(userId, 'SLACK_LIST_STARRED_ITEMS', {
      limit: 50,
    });
    if (starred.successful) {
      all.push(...extractProviderRecords('slack', starred.data));
      lastResult = starred;
    }
  }

  return { items: all, result: lastResult };
}

async function fetchLinearItems(
  userId: string,
  metadata: Record<string, unknown> | null | undefined
): Promise<{ items: Record<string, unknown>[]; result: ComposioToolResult }> {
  const prefs = parseLinearPreferences(metadata);
  const assigneeArgs =
    prefs.configured && prefs.assignee_filter === 'me'
      ? { assignee_id: 'me' as const }
      : {};

  const all: Record<string, unknown>[] = [];
  let lastResult: ComposioToolResult = { successful: true, error: null, data: {} };

  if (prefs.configured && prefs.project_ids.length > 0) {
    for (const projectId of prefs.project_ids.slice(0, 20)) {
      const result = await executeComposioTool(userId, 'LINEAR_LIST_LINEAR_ISSUES', {
        first: 50,
        project_id: projectId,
        ...assigneeArgs,
      });
      lastResult = result;
      if (result.successful) {
        all.push(...extractProviderRecords('linear', result.data));
      }
    }
  } else {
    const result = await executeComposioTool(userId, 'LINEAR_LIST_LINEAR_ISSUES', {
      first: 50,
      ...assigneeArgs,
    });
    lastResult = result;
    if (result.successful) {
      all.push(...extractProviderRecords('linear', result.data));
    }
  }

  let filtered = all;
  if (prefs.configured && prefs.team_ids.length > 0) {
    filtered = filtered.filter((issue) => {
      const teamId = linearIssueTeamId(issue);
      return teamId ? prefs.team_ids.includes(teamId) : false;
    });
  }
  if (prefs.configured && !prefs.include_completed) {
    filtered = filtered.filter((issue) => !linearIssueCompleted(issue));
  }

  return { items: filtered, result: lastResult };
}

/** Fetches raw items for a provider, including Notion's per-database fan-out. */
async function fetchProviderItems(
  userId: string,
  provider: ProIntegrationProvider,
  databaseIds: string[],
  metadata?: Record<string, unknown> | null
): Promise<{ items: Record<string, unknown>[]; result: ComposioToolResult }> {
  if (provider === 'notion' && databaseIds.length > 0) {
    const all: Record<string, unknown>[] = [];
    let lastResult: ComposioToolResult = { successful: true, error: null, data: {} };
    for (const databaseId of databaseIds) {
      const attempts = NOTION_DATABASE_QUERY_ATTEMPTS.map((attempt) => ({
        ...attempt,
        args: { ...attempt.args, database_id: databaseId },
      }));
      const res = await executeComposioToolAttempts(userId, attempts);
      lastResult = res;
      if (res.successful) {
        all.push(...extractProviderRecords('notion', res.data));
      }
    }
    if (all.length > 0) return { items: all, result: lastResult };

    const search = await executeComposioToolAttempts(
      userId,
      NOTION_WORKSPACE_SEARCH_ATTEMPTS
    );
    return { items: extractProviderRecords('notion', search.data), result: search };
  }

  if (provider === 'slack') {
    return fetchSlackItems(userId, metadata);
  }

  if (provider === 'linear') {
    return fetchLinearItems(userId, metadata);
  }

  const attempts = PROVIDER_SYNC_ATTEMPTS[provider];
  const result = await executeComposioToolAttempts(userId, attempts);
  return {
    items: extractProviderRecords(provider, result.data),
    result,
  };
}

/**
 * Probes whether Composio can read from a connected provider using the same
 * tool slugs as sync. Used for post-connect verification.
 */
export async function verifyComposioProviderAccess(
  userId: string,
  provider: ProIntegrationProvider
): Promise<{ ok: boolean; error: string | null; slug: string | null }> {
  if (provider === 'notion') {
    const account = await getIntegrationAccount(userId, 'notion');
    const databaseIds =
      (account?.metadata?.notion_database_ids as string[] | undefined) ?? [];
    const { result } = await fetchProviderItems(userId, provider, databaseIds, account?.metadata);
    return {
      ok: result.successful,
      error: result.error,
      slug: null,
    };
  }

  const account = await getIntegrationAccount(userId, provider);
  const { result } = await fetchProviderItems(
    userId,
    provider,
    [],
    account?.metadata
  );
  return {
    ok: result.successful,
    error: result.error,
    slug: null,
  };
}

/**
 * Syncs a single provider's items into `source_items`. Returns the number of
 * open (non-completed) items written. Records sync-run rows and updates the
 * provider's `integration_accounts` status, mirroring the Google sync.
 */
export async function syncComposioProvider(
  userId: string,
  provider: ProIntegrationProvider
): Promise<number> {
  const accountId = await upsertIntegrationAccount({
    userId,
    provider,
    status: 'connected',
  });

  const account = await getIntegrationAccount(userId, provider);
  const databaseIds =
    (account?.metadata?.notion_database_ids as string[] | undefined) ?? [];

  const { data: syncRun } = await supabaseAdmin
    .from('integration_sync_runs')
    .insert({
      user_id: userId,
      account_id: accountId,
      provider,
      status: 'running',
    })
    .select('id')
    .single();
  const syncRunId = syncRun?.id;

  try {
    const { items: rawItems, result } = await fetchProviderItems(
      userId,
      provider,
      databaseIds,
      account?.metadata
    );

    if (!result.successful && rawItems.length === 0) {
      throw new Error(result.error || `${provider} sync returned no usable data`);
    }

    const mapped = mapItemsForProvider(provider, rawItems);
    const now = new Date().toISOString();

    if (mapped.length > 0) {
      const rows = mapped.map((item) => ({
        user_id: userId,
        provider,
        external_id: item.external_id,
        item_type: item.item_type,
        title: item.title,
        description: item.description,
        due_date: item.due_date,
        url: item.url,
        status: item.status,
        priority: item.priority,
        completed: item.completed,
        assignees: item.assignees,
        raw_data: item.raw_data,
        deleted_at: null,
        updated_at: now,
      }));

      const { error: upsertError } = await supabaseAdmin
        .from('source_items')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(rows as any, { onConflict: 'user_id,provider,external_id' });
      if (upsertError) throw upsertError;

      const currentIds = mapped.map((m) => m.external_id);
      const { data: existing } = await supabaseAdmin
        .from('source_items')
        .select('id, external_id')
        .eq('user_id', userId)
        .eq('provider', provider)
        .is('deleted_at', null)
        .is('imported_task_id', null);

      const staleIds = (existing ?? [])
        .filter((row) => !currentIds.includes(row.external_id))
        .map((row) => row.id);

      if (staleIds.length > 0) {
        await supabaseAdmin
          .from('source_items')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ deleted_at: now } as any)
          .in('id', staleIds);
      }
    }

    await supabaseAdmin
      .from('integration_accounts')
      .update({ last_synced_at: now, status: 'connected', last_error: null })
      .eq('id', accountId)
      .eq('user_id', userId);

    if (syncRunId) {
      await supabaseAdmin
        .from('integration_sync_runs')
        .update({
          status: 'success',
          finished_at: now,
          items_seen: mapped.length,
        })
        .eq('id', syncRunId);
    }

    return mapped.filter((m) => !m.completed).length;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from('integration_accounts')
      .update({ status: 'error', last_error: message })
      .eq('id', accountId)
      .eq('user_id', userId);
    if (syncRunId) {
      await supabaseAdmin
        .from('integration_sync_runs')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: message,
        })
        .eq('id', syncRunId);
    }
    throw err;
  }
}

/**
 * Syncs every connected Pro provider for a user. Individual provider failures
 * are isolated so one broken toolkit does not abort the others.
 */
export async function syncAllComposioProviders(
  userId: string,
  only?: ProIntegrationProvider
): Promise<SyncResult> {
  const active = await getActiveProProviders(userId);
  const providers = only ? active.filter((p) => p === only) : active;

  const result: SyncResult = {};
  for (const provider of providers) {
    try {
      result[provider] = await syncComposioProvider(userId, provider);
    } catch (err) {
      console.warn(`[composio-sync] ${provider} failed:`, err);
      result[provider] = 0;
    }
  }
  return result;
}
