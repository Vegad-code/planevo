import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * SSRF protection for user-supplied Canvas LMS URLs.
 *
 * Two layers:
 *  - `isAllowedCanvasUrl` (sync): cheap format + literal-host/IP checks. Safe to
 *    use in schema-level validation and as a fast pre-check.
 *  - `assertCanvasUrlSafe` (async): resolves the hostname via DNS and rejects if
 *    ANY resolved address is private/reserved. Use this before any server-side
 *    fetch to a stored/user-supplied Canvas URL.
 *
 * Note on DNS rebinding: there is an inherent TOCTOU gap between resolving here
 * and the actual fetch (which re-resolves). Resolving + rejecting private targets
 * closes the common SSRF vectors; pinning the resolved IP at connect time would
 * be required to fully eliminate rebinding and is out of scope here.
 */

function stripBrackets(host: string): string {
  return host.replace(/^\[/, '').replace(/\]$/, '');
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true; // malformed → treat as unsafe
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast/reserved 224.0.0.0/3
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const addr = stripBrackets(ip).toLowerCase();
  if (addr === '::1' || addr === '::') return true; // loopback / unspecified
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]); // IPv4-mapped
  if (addr.startsWith('fe80')) return true; // link-local fe80::/10
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // unique local fc00::/7
  return false;
}

/** Returns true if `ip` is a private/reserved/loopback address (or not a valid IP). */
export function isPrivateIp(ip: string): boolean {
  const kind = isIP(stripBrackets(ip));
  if (kind === 4) return isPrivateIPv4(stripBrackets(ip));
  if (kind === 6) return isPrivateIPv6(ip);
  return true; // not a valid IP literal → unsafe
}

function isPrivateHostname(hostname: string): boolean {
  const h = stripBrackets(hostname).toLowerCase();
  if (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  ) {
    return true;
  }
  if (isIP(h) && isPrivateIp(h)) return true;
  return false;
}

function parseCanvasUrl(raw: string): URL | null {
  const trimmed = raw.trim().replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const isDev = process.env.NODE_ENV === 'development';
  if (url.protocol !== 'https:' && !(isDev && url.protocol === 'http:')) {
    return null;
  }

  if (isPrivateHostname(url.hostname)) {
    return null;
  }

  return url;
}

/**
 * Synchronous format + literal-host validation. Blocks non-HTTPS (outside dev),
 * malformed URLs, and obvious private hosts / IP literals. Does NOT resolve DNS.
 */
export function isAllowedCanvasUrl(raw: string): boolean {
  return parseCanvasUrl(raw) !== null;
}

export type CanvasUrlResolver = (hostname: string) => Promise<Array<{ address: string }>>;

const defaultResolver: CanvasUrlResolver = (hostname) => lookup(hostname, { all: true });

export type CanvasUrlValidation =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/**
 * Full SSRF check: format validation plus DNS resolution. Rejects when the host
 * resolves to any private/reserved address. Use before server-side Canvas fetches.
 */
export async function assertCanvasUrlSafe(
  raw: string,
  resolver: CanvasUrlResolver = defaultResolver
): Promise<CanvasUrlValidation> {
  const url = parseCanvasUrl(raw);
  if (!url) {
    return { ok: false, reason: 'Invalid or disallowed Canvas URL' };
  }

  const normalized = url.toString().replace(/\/+$/, '');
  const bareHost = stripBrackets(url.hostname);

  // IP literals were already validated synchronously; no DNS needed.
  if (isIP(bareHost)) {
    return { ok: true, url: normalized };
  }

  try {
    const records = await resolver(url.hostname);
    if (!records || records.length === 0) {
      return { ok: false, reason: 'Canvas host did not resolve' };
    }
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        return { ok: false, reason: 'Canvas host resolves to a private address' };
      }
    }
  } catch {
    return { ok: false, reason: 'Canvas host could not be resolved' };
  }

  return { ok: true, url: normalized };
}
