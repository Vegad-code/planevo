import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

/**
 * Mobile observability — Sentry + PostHog.
 *
 * Call `initObservability()` once in the root layout (before render).
 * Call `identifyUser(id, email, planType)` after sign-in.
 * Call `resetUser()` on sign-out.
 */

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

let posthogClient: PostHog | null = null;
let _initialised = false;

export function initObservability() {
  if (_initialised) return;
  _initialised = true;

  // --- Sentry ---
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.2,
      environment: __DEV__ ? 'development' : 'production',
    });
  }

  // --- PostHog ---
  if (POSTHOG_API_KEY) {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
  }
}

/**
 * Identify the current user across both Sentry and PostHog.
 */
export function identifyUser(userId: string, email?: string, planType?: string) {
  if (SENTRY_DSN) {
    Sentry.setUser({ id: userId, email: email ?? undefined });
    if (planType) Sentry.setTag('plan_type', planType);
  }

  posthogClient?.identify(userId, {
    email: email ?? '',
    plan_type: planType ?? 'free',
  });
}

/**
 * Reset user context (sign-out).
 */
export function resetUser() {
  Sentry.setUser(null);
  posthogClient?.reset();
}

/**
 * Capture a named analytics event.
 */
export function captureEvent(event: string, properties?: Record<string, string | number | boolean>) {
  posthogClient?.capture(event, properties);
}

/**
 * Re-export Sentry's `wrap` for use on the root component.
 */
export const sentryWrap = Sentry.wrap;
