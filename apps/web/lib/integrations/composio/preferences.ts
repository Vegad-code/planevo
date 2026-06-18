import type { IntegrationAccountCredentials } from '@/lib/integrations/accounts';

export interface SlackIntegrationPreferences {
  channel_ids: string[];
  include_starred: boolean;
  include_dms: boolean;
  /** True once the user has saved Slack manage settings at least once. */
  configured: boolean;
}

export interface LinearIntegrationPreferences {
  team_ids: string[];
  project_ids: string[];
  include_completed: boolean;
  assignee_filter: 'all' | 'me';
  configured: boolean;
}

export function parseSlackPreferences(
  metadata: IntegrationAccountCredentials['metadata'] | Record<string, unknown> | null | undefined
): SlackIntegrationPreferences {
  const raw = metadata ?? {};
  const channelIds = raw.slack_channel_ids;
  return {
    channel_ids: Array.isArray(channelIds) ? channelIds.map(String) : [],
    include_starred: raw.slack_include_starred !== false,
    include_dms: raw.slack_include_dms === true,
    configured: raw.slack_preferences_configured === true,
  };
}

export function parseLinearPreferences(
  metadata: IntegrationAccountCredentials['metadata'] | Record<string, unknown> | null | undefined
): LinearIntegrationPreferences {
  const raw = metadata ?? {};
  const teamIds = raw.linear_team_ids;
  const projectIds = raw.linear_project_ids;
  const assignee = raw.linear_assignee_filter;
  return {
    team_ids: Array.isArray(teamIds) ? teamIds.map(String) : [],
    project_ids: Array.isArray(projectIds) ? projectIds.map(String) : [],
    include_completed: raw.linear_include_completed === true,
    assignee_filter: assignee === 'me' ? 'me' : 'all',
    configured: raw.linear_preferences_configured === true,
  };
}

/** When preferences were never saved, default to all available IDs (matches legacy sync scope). */
export function resolvePickerSelection(
  savedIds: string[],
  configured: boolean,
  allIds: string[]
): string[] {
  if (!configured) return allIds;
  return savedIds;
}

export function buildSlackMetadataPatch(
  existing: Record<string, unknown> | null | undefined,
  prefs: Pick<SlackIntegrationPreferences, 'channel_ids' | 'include_starred' | 'include_dms'>
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    slack_channel_ids: prefs.channel_ids,
    slack_include_starred: prefs.include_starred,
    slack_include_dms: prefs.include_dms,
    slack_preferences_configured: true,
  };
}

export function buildLinearMetadataPatch(
  existing: Record<string, unknown> | null | undefined,
  prefs: Pick<
    LinearIntegrationPreferences,
    'team_ids' | 'project_ids' | 'include_completed' | 'assignee_filter'
  >
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    linear_team_ids: prefs.team_ids,
    linear_project_ids: prefs.project_ids,
    linear_include_completed: prefs.include_completed,
    linear_assignee_filter: prefs.assignee_filter,
    linear_preferences_configured: true,
  };
}
