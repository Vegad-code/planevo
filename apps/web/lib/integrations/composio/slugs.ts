import type { ProIntegrationProvider } from '@/lib/integrations/types';
import { PRO_PROVIDERS } from './constants';

function normalizeSlug(raw: unknown): ProIntegrationProvider | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.toLowerCase();
  return (PRO_PROVIDERS as string[]).includes(lower)
    ? (lower as ProIntegrationProvider)
    : null;
}

/** Extract a supported toolkit slug from a raw Composio connected-account item. */
export function extractConnectionSlug(item: {
  toolkit?: { slug?: unknown };
  appName?: unknown;
  appUniqueId?: unknown;
}): ProIntegrationProvider | null {
  return normalizeSlug(
    item.toolkit?.slug ?? item.appName ?? item.appUniqueId
  );
}
