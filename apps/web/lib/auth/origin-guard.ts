import { NextRequest } from 'next/server';

/**
 * Validates that an incoming request originates from an allowed domain.
 * Checks the Origin header first, then falls back to the Referer header.
 *
 * In development, localhost:3000 is always allowed.
 * Cron endpoints can bypass this by passing a valid CRON_SECRET in the
 * Authorization header. Use `isAllowedOriginOrCron()` for those routes.
 */

const ALLOWED_ORIGINS: string[] = [
  process.env.NEXT_PUBLIC_APP_URL || 'https://planevo.app',
];

if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3000');
  ALLOWED_ORIGINS.push('http://127.0.0.1:3000');
}

function normalizeOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

/**
 * Returns true if the request's Origin/Referer matches an allowed origin.
 */
export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin) {
    const normalized = normalizeOrigin(origin);
    if (ALLOWED_ORIGINS.includes(normalized)) return true;
  }

  if (referer) {
    const normalized = normalizeOrigin(referer);
    if (ALLOWED_ORIGINS.includes(normalized)) return true;
  }

  console.warn(
    `[origin-guard] Blocked request from origin="${origin}" referer="${referer}"`
  );
  return false;
}

/**
 * Returns true if the request has a valid origin OR a valid CRON_SECRET.
 * Use this for cron-triggered endpoints that need to accept server-to-server calls.
 */
export function isAllowedOriginOrCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  }

  return isAllowedOrigin(request);
}
