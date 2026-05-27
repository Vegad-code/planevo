import posthog from 'posthog-js';

/**
 * PostHog product analytics client.
 *
 * Initializes once on first import (client-side only).
 * Uses `person_profiles: 'identified_only'` so anonymous
 * users are tracked as events only — no person record is
 * created until `posthog.identify()` is called.
 */

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key) {
    console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY is not set — analytics disabled.');
    return;
  }

  posthog.init(key, {
    api_host: host || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    // TODO: LAUNCH CHECK - Uncomment the loaded hook below before deploying to production so development events are not sent to PostHog.
    // loaded: (ph) => {
    //   // In development, disable sending events to PostHog
    //   if (process.env.NODE_ENV === 'development') {
    //     ph.opt_out_capturing();
    //   }
    // },
  });

  initialized = true;
}

export { posthog };
