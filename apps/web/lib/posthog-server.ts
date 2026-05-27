import { PostHog } from 'posthog-node';

/**
 * Server-side PostHog client.
 *
 * Uses the same project API key as the client-side SDK so all events
 * land in one PostHog project.  Calls `shutdown()` lazily via a
 * `process.on('beforeExit')` hook so pending events flush on deploy.
 *
 * Usage (in API routes / server actions):
 *   import { posthogServer } from '@/lib/posthog-server';
 *   posthogServer.capture({ distinctId: userId, event: '...', properties: {...} });
 */

let _client: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  if (_client) return _client;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    console.warn('[PostHog Server] NEXT_PUBLIC_POSTHOG_KEY is not set — server analytics disabled.');
    return null;
  }

  _client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // Flush every 30 seconds or after 20 events — keeps latency low
    flushInterval: 30_000,
    flushAt: 20,
  });

  // Graceful shutdown: flush pending events before process exits
  process.on('beforeExit', async () => {
    await _client?.shutdown();
  });

  return _client;
}

/** Convenience re-export so callers can do `posthogServer.capture(...)` */
export const posthogServer = {
  capture(args: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }) {
    getPostHogServer()?.capture(args);
  },
};
