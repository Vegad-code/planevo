/**
 * Shared types for Planevo's Pro integrations (Notion, Slack, Linear via Composio).
 * No server-only imports here so this can be used from client and server code.
 */

export type ProIntegrationProvider = 'notion' | 'slack' | 'linear';

export const PRO_PROVIDER_LABELS: Record<ProIntegrationProvider, string> = {
  notion: 'Notion',
  slack: 'Slack',
  linear: 'Linear',
};

/**
 * Lightweight per-provider summary surfaced on the dashboard, in Bruno's
 * context, and in suggested actions. Computed from `source_items` so it does
 * not require a live Composio call on every page load.
 */
export interface IntegrationPulse {
  provider: ProIntegrationProvider;
  connected: boolean;
  openCount: number;
  dueThisWeek: number;
  lastSyncedAt: string | null;
  /** Human-readable summary, e.g. "5 open issues". */
  label: string;
}

/** Normalized shape used by UI surfaces that render `source_items` as tasks. */
export interface SourceItemTask {
  id: string;
  provider: ProIntegrationProvider | string;
  title: string;
  description: string | null;
  dueDate: string | null;
  url: string | null;
  status: string | null;
  priority: string | null;
  completed: boolean;
}

/** Result of a sync run, keyed by provider. */
export type SyncResult = Partial<Record<ProIntegrationProvider, number>>;
