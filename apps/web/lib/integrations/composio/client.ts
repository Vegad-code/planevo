import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import type { ProIntegrationProvider } from '@/lib/integrations/types';
import { getComposioClientOptions } from './config';
import { filterBrunoChatTools } from './providerTools';
import { PRO_PROVIDERS } from './constants';
import { extractConnectionSlug } from './slugs';

export { PRO_PROVIDERS } from './constants';
export { extractConnectionSlug } from './slugs';

export type LinkPrepareResult = 'already_connected' | 'ready';

export interface ComposioConnectedAccount {
  id: string;
  slug: ProIntegrationProvider;
  status: string;
  active: boolean;
}

/** A Composio tool execution result, normalized to the SDK's response shape. */
export interface ComposioToolResult {
  successful: boolean;
  error: string | null;
  data: Record<string, unknown>;
}

let cachedClient: Composio | null = null;

/**
 * Returns a singleton Composio client, or null when the API key is not
 * configured (e.g. local dev without integrations). Callers must handle null.
 */
export function getComposioClient(): Composio | null {
  if (!process.env.COMPOSIO_API_KEY) return null;
  if (!cachedClient) {
    cachedClient = new Composio(
      getComposioClientOptions(process.env.COMPOSIO_API_KEY)
    );
  }
  return cachedClient;
}

/**
 * Loads Vercel-wrapped Composio tools for Bruno chat. Uses direct app toolkit
 * actions (NOTION_*, SLACK_*, LINEAR_*) — not tool-router meta tools like
 * COMPOSIO_SEARCH_TOOLS, which burn steps without producing a user response.
 */
export async function getBrunoComposioTools(
  userId: string,
  providers: ProIntegrationProvider[]
): Promise<Record<string, unknown>> {
  if (!process.env.COMPOSIO_API_KEY || providers.length === 0) return {};

  const composio = new Composio({
    ...getComposioClientOptions(process.env.COMPOSIO_API_KEY),
    provider: new VercelProvider(),
  });

  const rawTools = await composio.tools.get(userId, {
    toolkits: providers,
  });

  return filterBrunoChatTools(rawTools as Record<string, unknown>);
}


function accountTimestamp(item: { createdAt?: unknown; updatedAt?: unknown }): number {
  for (const value of [item.updatedAt, item.createdAt]) {
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

/**
 * Ensures link() won't fail on duplicate ACTIVE accounts. Keeps one account
 * per auth config and treats an existing ACTIVE connection as already linked.
 */
export async function prepareConnectionForLink(
  userId: string,
  authConfigId: string,
  mode: 'connect' | 'reconnect' = 'connect'
): Promise<LinkPrepareResult> {
  const composio = getComposioClient();
  if (!composio) {
    throw new Error('Composio API key missing');
  }

  const response = await composio.connectedAccounts.list({
    userIds: [userId],
    authConfigIds: [authConfigId],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = response?.items ?? [];
  const active = items.filter(
    (item) => String(item?.status ?? '').toUpperCase() === 'ACTIVE'
  );

  if (mode === 'reconnect') {
    for (const account of active) {
      if (account?.id) {
        await composio.connectedAccounts.delete(String(account.id));
      }
    }
    return 'ready';
  }

  if (active.length === 0) return 'ready';

  if (active.length === 1) return 'already_connected';

  const sorted = [...active].sort(
    (a, b) => accountTimestamp(b) - accountTimestamp(a)
  );
  for (const account of sorted.slice(1)) {
    if (account?.id) {
      console.warn(
        '[composio] Removing duplicate ACTIVE connection:',
        account.id
      );
      await composio.connectedAccounts.delete(String(account.id));
    }
  }
  return 'already_connected';
}

/**
 * Removes duplicate ACTIVE Composio accounts for supported toolkits,
 * keeping the most recently updated connection per provider.
 */
export async function dedupeComposioConnections(userId: string): Promise<void> {
  const composio = getComposioClient();
  if (!composio) return;

  const response = await composio.connectedAccounts.list({ userIds: [userId] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = response?.items ?? [];

  const activeBySlug = new Map<ProIntegrationProvider, any[]>();
  for (const item of items) {
    if (String(item?.status ?? '').toUpperCase() !== 'ACTIVE') continue;
    const slug = extractConnectionSlug(item);
    if (!slug) continue;
    const group = activeBySlug.get(slug) ?? [];
    group.push(item);
    activeBySlug.set(slug, group);
  }

  for (const [, accounts] of activeBySlug) {
    if (accounts.length <= 1) continue;
    const sorted = [...accounts].sort(
      (a, b) => accountTimestamp(b) - accountTimestamp(a)
    );
    for (const account of sorted.slice(1)) {
      if (account?.id) {
        console.warn(
          '[composio] Removing duplicate ACTIVE connection:',
          account.id
        );
        await composio.connectedAccounts.delete(String(account.id));
      }
    }
  }
}

/**
 * Lists the user's connected Composio accounts, filtered to the Pro providers
 * Planevo supports. Returns an empty array when Composio is not configured.
 */
export async function listComposioConnectedAccounts(
  userId: string
): Promise<ComposioConnectedAccount[]> {
  const composio = getComposioClient();
  if (!composio) return [];

  const response = await composio.connectedAccounts.list({ userIds: [userId] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = response?.items ?? [];

  return items
    .map((item) => {
      const slug = extractConnectionSlug(item);
      if (!slug) return null;
      const status = String(item?.status ?? 'UNKNOWN');
      return {
        id: String(item?.id ?? ''),
        slug,
        status,
        active: status.toUpperCase() === 'ACTIVE',
      } satisfies ComposioConnectedAccount;
    })
    .filter((a): a is ComposioConnectedAccount => a !== null);
}

/** Returns the set of Pro providers that are connected AND active for a user. */
export async function getActiveProProviders(
  userId: string
): Promise<ProIntegrationProvider[]> {
  const accounts = await listComposioConnectedAccounts(userId);
  return accounts.filter((a) => a.active).map((a) => a.slug);
}

/**
 * Executes a single Composio tool on behalf of a user. Never throws — failures
 * are returned as `{ successful: false, error }` so callers can degrade cleanly.
 */
export async function executeComposioTool(
  userId: string,
  slug: string,
  args: Record<string, unknown> = {}
): Promise<ComposioToolResult> {
  const composio = getComposioClient();
  if (!composio) {
    return { successful: false, error: 'Composio not configured', data: {} };
  }

  try {
    const result = await composio.tools.execute(slug, {
      userId,
      arguments: args,
    });
    return {
      successful: Boolean(result?.successful),
      error: result?.error ?? null,
      data: (result?.data as Record<string, unknown>) ?? {},
    };
  } catch (err) {
    return {
      successful: false,
      error: err instanceof Error ? err.message : String(err),
      data: {},
    };
  }
}

/**
 * Tries a prioritized list of candidate tool slugs and returns the first
 * successful result. Composio occasionally renames toolkit actions, so the
 * sync engine probes a small set of known slugs rather than hard-coding one.
 */
export async function executeFirstAvailableTool(
  userId: string,
  candidateSlugs: string[],
  args: Record<string, unknown> = {}
): Promise<ComposioToolResult & { slug: string | null }> {
  let lastError: string | null = 'No candidate tools provided';
  for (const slug of candidateSlugs) {
    const result = await executeComposioTool(userId, slug, args);
    if (result.successful) {
      return { ...result, slug };
    }
    lastError = result.error;
  }
  return { successful: false, error: lastError, data: {}, slug: null };
}
