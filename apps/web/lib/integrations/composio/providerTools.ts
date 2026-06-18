import type { ComposioToolResult } from './client';
import { executeComposioTool } from './client';
import type { ProIntegrationProvider } from '@/lib/integrations/types';
import { extractComposioRecords } from './composioPayload';

export interface ComposioToolAttempt {
  slug: string;
  args: Record<string, unknown>;
}

export async function executeComposioToolAttempts(
  userId: string,
  attempts: ComposioToolAttempt[]
): Promise<ComposioToolResult & { slug: string | null }> {
  let lastError: string | null = 'No candidate tools provided';
  for (const { slug, args } of attempts) {
    const result = await executeComposioTool(userId, slug, args);
    if (result.successful) {
      return { ...result, slug };
    }
    lastError = result.error;
  }
  return { successful: false, error: lastError, data: {}, slug: null };
}

/** Notion database listing (settings picker). */
export const NOTION_LIST_DATABASE_ATTEMPTS: ComposioToolAttempt[] = [
  {
    slug: 'NOTION_FETCH_DATA',
    args: { fetch_type: 'databases', page_size: 100 },
  },
  {
    slug: 'NOTION_SEARCH_NOTION_PAGE',
    args: {
      query: '',
      filter_property: 'object',
      filter_value: 'database',
      page_size: 100,
    },
  },
];

/** Notion workspace search for sync fallback. */
export const NOTION_WORKSPACE_SEARCH_ATTEMPTS: ComposioToolAttempt[] = [
  {
    slug: 'NOTION_SEARCH_NOTION_PAGE',
    args: { query: '', page_size: 50 },
  },
  {
    slug: 'NOTION_FETCH_DATA',
    args: { fetch_type: 'all', page_size: 50 },
  },
];

/** Notion per-database query for sync. */
export const NOTION_DATABASE_QUERY_ATTEMPTS: ComposioToolAttempt[] = [
  {
    slug: 'NOTION_QUERY_DATABASE',
    args: { page_size: 50 },
  },
  {
    slug: 'NOTION_FETCH_DATABASE',
    args: {},
  },
];

/**
 * Slack channel listing for the manage UI.
 */
export const SLACK_LIST_CHANNEL_ATTEMPTS: ComposioToolAttempt[] = [
  {
    slug: 'SLACK_LIST_ALL_CHANNELS',
    args: { limit: 200, exclude_archived: true },
  },
  {
    slug: 'SLACK_LIST_CONVERSATIONS',
    args: { limit: 200, exclude_archived: true },
  },
];

/**
 * Linear team / project listing for the manage UI.
 */
export const LINEAR_LIST_TEAMS_ATTEMPTS: ComposioToolAttempt[] = [
  { slug: 'LINEAR_LIST_LINEAR_TEAMS', args: { first: 100 } },
];

export const LINEAR_LIST_PROJECTS_ATTEMPTS: ComposioToolAttempt[] = [
  { slug: 'LINEAR_LIST_LINEAR_PROJECTS', args: { first: 100 } },
];

/**
 * Slack sync: workspace message search and starred items.
 * Avoids removed slugs like SLACK_LIST_SAVED_ITEMS / SLACK_FETCH_ITEMS.
 */
export const SLACK_SYNC_ATTEMPTS: ComposioToolAttempt[] = [
  {
    slug: 'SLACK_SEARCH_MESSAGES',
    args: { query: 'after:2024-01-01', count: 50 },
  },
  {
    slug: 'SLACK_LIST_STARRED_ITEMS',
    args: { limit: 50 },
  },
];

/**
 * Linear sync: list open issues across accessible projects.
 * Avoids removed slugs like LINEAR_LIST_ISSUES / LINEAR_GET_ISSUES.
 */
export const LINEAR_SYNC_ATTEMPTS: ComposioToolAttempt[] = [
  {
    slug: 'LINEAR_LIST_LINEAR_ISSUES',
    args: { first: 50 },
  },
];

const SLACK_CHANNEL_KEYS = ['channels', 'conversations', 'items', 'results', 'data'];
const LINEAR_TEAM_KEYS = ['teams', 'nodes', 'items', 'results', 'data'];
const LINEAR_PROJECT_KEYS = ['projects', 'items', 'results', 'data'];

const RECORD_KEYS: Record<ProIntegrationProvider, string[]> = {
  notion: ['databases', 'results', 'items', 'pages', 'data', 'records', 'rows'],
  slack: ['messages', 'matches', 'items', 'results', 'data'],
  linear: ['issues', 'results', 'items', 'nodes', 'data'],
};

export const PROVIDER_SYNC_ATTEMPTS: Record<
  ProIntegrationProvider,
  ComposioToolAttempt[]
> = {
  notion: NOTION_WORKSPACE_SEARCH_ATTEMPTS,
  slack: SLACK_SYNC_ATTEMPTS,
  linear: LINEAR_SYNC_ATTEMPTS,
};

export function extractProviderRecords(
  provider: ProIntegrationProvider,
  data: Record<string, unknown>
): Record<string, unknown>[] {
  return extractComposioRecords(data, RECORD_KEYS[provider]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractNotionDatabaseTitle(db: any): string {
  const title =
    db?.title?.[0]?.plain_text ??
    db?.title?.[0]?.text?.content ??
    db?.name ??
    'Untitled Database';
  return String(title);
}

export function mapNotionDatabaseOptions(
  records: Record<string, unknown>[],
  selectedIds: string[]
): Array<{ id: string; title: string; selected: boolean }> {
  return records
    .filter((db) => db.object === 'database' || db.id)
    .map((db) => ({
      id: String(db.id),
      title: extractNotionDatabaseTitle(db),
      selected: selectedIds.includes(String(db.id)),
    }));
}

function slackChannelLabel(channel: Record<string, unknown>): string {
  const name = channel.name ?? channel.name_normalized;
  if (typeof name === 'string' && name.length > 0) {
    const isIm = channel.is_im === true || String(channel.id ?? '').startsWith('D');
    const isMpim = channel.is_mpim === true;
    if (isIm) return `DM: ${name}`;
    if (isMpim) return `Group DM: ${name}`;
    return `#${name}`;
  }
  return String(channel.id ?? 'Channel');
}

export function mapSlackChannelOptions(
  records: Record<string, unknown>[],
  selectedIds: string[]
): Array<{ id: string; title: string; selected: boolean; isPrivate: boolean }> {
  return records
    .filter((channel) => channel.id)
    .map((channel) => ({
      id: String(channel.id),
      title: slackChannelLabel(channel),
      selected: selectedIds.includes(String(channel.id)),
      isPrivate: channel.is_private === true || channel.is_group === true,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function mapLinearTeamOptions(
  records: Record<string, unknown>[],
  selectedIds: string[]
): Array<{ id: string; title: string; selected: boolean }> {
  return records
    .filter((team) => team.id)
    .map((team) => ({
      id: String(team.id),
      title: String(team.name ?? team.key ?? team.id),
      selected: selectedIds.includes(String(team.id)),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function mapLinearProjectOptions(
  records: Record<string, unknown>[],
  selectedIds: string[]
): Array<{ id: string; title: string; selected: boolean; teamId: string | null }> {
  return records
    .filter((project) => project.id)
    .map((project) => {
      const team = project.team;
      const teamId =
        typeof team === 'object' && team !== null
          ? String((team as Record<string, unknown>).id ?? '')
          : asString(project.teamId);
      return {
        id: String(project.id),
        title: String(project.name ?? project.id),
        selected: selectedIds.includes(String(project.id)),
        teamId: teamId || null,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

export function slackListChannelTypes(includeDms: boolean): string {
  const types = ['public_channel', 'private_channel'];
  if (includeDms) types.push('im', 'mpim');
  return types.join(',');
}

export function extractSlackChannels(data: Record<string, unknown>): Record<string, unknown>[] {
  return extractComposioRecords(data, SLACK_CHANNEL_KEYS);
}

export function extractLinearTeams(data: Record<string, unknown>): Record<string, unknown>[] {
  return extractComposioRecords(data, LINEAR_TEAM_KEYS);
}

export function extractLinearProjects(data: Record<string, unknown>): Record<string, unknown>[] {
  return extractComposioRecords(data, LINEAR_PROJECT_KEYS);
}
