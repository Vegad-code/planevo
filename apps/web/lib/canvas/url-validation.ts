import { URL } from 'url';

/**
 * Validates that a Canvas LMS URL is a legitimate external host.
 * Blocks private/internal IPs and non-HTTPS in production to prevent SSRF.
 */
export function isAllowedCanvasUrl(raw: string): boolean {
  const trimmed = raw.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (process.env.NODE_ENV !== 'development' && parsed.protocol !== 'https:') {
    return false;
  }

  if (!['https:', 'http:'].includes(parsed.protocol)) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isPrivateHostname(hostname)) {
    return false;
  }

  return true;
}

function isPrivateHostname(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return true;
  }

  // Check for private IPv4 ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return true;                        // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true;           // 192.168.0.0/16
    if (a === 169 && b === 254) return true;           // link-local
    if (a === 0) return true;                          // 0.0.0.0/8
  }

  return false;
}
