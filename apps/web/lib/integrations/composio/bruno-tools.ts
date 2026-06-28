import { Composio } from '@composio/core';
import type { ProIntegrationProvider } from '@/lib/integrations/types';
import { getComposioClientOptions } from './config';
import { filterBrunoChatTools } from './providerTools';

/**
 * Loads Vercel-wrapped Composio tools for Bruno chat. Uses direct app toolkit
 * actions (NOTION_*, SLACK_*, LINEAR_*) — not tool-router meta tools like
 * COMPOSIO_SEARCH_TOOLS, which burn steps without producing a user response.
 *
 * `@composio/vercel` is loaded dynamically so API routes that only need
 * `@composio/core` (connections, connect, etc.) do not bundle the Vercel provider.
 */
export async function getBrunoComposioTools(
  userId: string,
  providers: ProIntegrationProvider[]
): Promise<Record<string, unknown>> {
  if (!process.env.COMPOSIO_API_KEY || providers.length === 0) return {};

  const { VercelProvider } = await import('@composio/vercel');

  const composio = new Composio({
    ...getComposioClientOptions(process.env.COMPOSIO_API_KEY),
    provider: new VercelProvider(),
  });

  const rawTools = await composio.tools.get(userId, {
    toolkits: providers,
  });

  return filterBrunoChatTools(rawTools as Record<string, unknown>);
}
