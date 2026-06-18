import { NextRequest } from 'next/server';

const LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function normalizeOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function getAllowedOrigins(): string[] {
  const origins = new Set<string>();
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    const normalized = normalizeOrigin(configured);
    if (normalized) origins.add(normalized);
  }
  for (const local of LOCAL_ORIGINS) {
    origins.add(local);
  }
  return [...origins];
}

function isAllowedOAuthOrigin(origin: string): boolean {
  return getAllowedOrigins().includes(origin);
}

/**
 * Prefer the browser origin that initiated the connect request so OAuth
 * callbacks return to localhost during dev even when NEXT_PUBLIC_APP_URL
 * points at production.
 */
export function getOAuthOrigin(request: NextRequest): string {
  const headerOrigin = request.headers.get('origin');
  if (headerOrigin) {
    const normalized = normalizeOrigin(headerOrigin);
    if (normalized && isAllowedOAuthOrigin(normalized)) return normalized;
  }

  const referer = request.headers.get('referer');
  if (referer) {
    const normalized = normalizeOrigin(referer);
    if (normalized && isAllowedOAuthOrigin(normalized)) return normalized;
  }

  const requestOrigin = normalizeOrigin(request.url);
  if (requestOrigin && isAllowedOAuthOrigin(requestOrigin)) return requestOrigin;

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    const normalized = normalizeOrigin(configured);
    if (normalized) return normalized;
  }

  return requestOrigin ?? 'http://localhost:3000';
}

const CALLBACK_PATH = '/api/integrations/composio/callback';

export function resolveComposioCallbackUrl(
  request: NextRequest,
  redirectUrl: unknown
): string {
  const appOrigin = getOAuthOrigin(request);

  if (typeof redirectUrl === 'string' && redirectUrl.length > 0) {
    try {
      const parsed = new URL(redirectUrl, appOrigin);
      if (
        parsed.origin === appOrigin &&
        parsed.pathname === CALLBACK_PATH
      ) {
        return parsed.toString();
      }
    } catch {
      // fall through to default
    }
  }

  return `${appOrigin}${CALLBACK_PATH}`;
}
