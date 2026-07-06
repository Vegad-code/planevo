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
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://planevo.co',
];

if (
  process.env.APP_URL &&
  !ALLOWED_ORIGINS.includes(process.env.APP_URL)
) {
  ALLOWED_ORIGINS.push(process.env.APP_URL);
}

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
 * Returns true if the request carries a valid Bearer user token.
 * Used by origin guard to allow mobile native requests that have
 * already been authenticated via getAuthenticatedUser().
 */
export function hasBearerToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  // Exclude cron tokens
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return false;
  return true;
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

/**
 * Origin guard that also allows authenticated mobile Bearer tokens.
 * - Browser POSTs: require valid Origin/Referer (CSRF protection)
 * - Mobile clients: allowed if they provide a Bearer token (auth verified separately)
 * - Cron: allowed if they provide valid CRON_SECRET
 */
export function isAllowedOriginOrBearer(request: NextRequest): boolean {
  // Mobile native clients send Bearer tokens without origin headers
  if (hasBearerToken(request)) return true;
  return isAllowedOriginOrCron(request);
}

const MOBILE_CLIENT_HEADER = 'x-planevo-client';

/**
 * Public auth endpoints (e.g. password reset) from native mobile clients.
 * The header is not secret — IP rate limits and uniform responses are the real controls.
 */
export function isMobileClient(request: NextRequest): boolean {
  return request.headers.get(MOBILE_CLIENT_HEADER)?.toLowerCase() === 'mobile';
}

/**
 * Browser CSRF protection, plus unauthenticated mobile public auth calls.
 */
export function isAllowedOriginOrMobileClient(request: NextRequest): boolean {
  if (isMobileClient(request)) return true;
  return isAllowedOrigin(request);
}
