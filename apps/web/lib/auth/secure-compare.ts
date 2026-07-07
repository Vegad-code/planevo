import { timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison for shared secrets (webhook headers, etc.).
 */
export function secureCompareString(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
}
