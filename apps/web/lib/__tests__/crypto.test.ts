import { describe, expect, it, beforeEach } from 'vitest';
import { encryptToken, decryptToken } from '@/lib/crypto';

describe('crypto', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  it('round-trips integration tokens', () => {
    const plain = 'canvas-token-abc';
    const encrypted = encryptToken(plain);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(decryptToken(encrypted)).toBe(plain);
  });

  it('rejects legacy plaintext', () => {
    expect(() => decryptToken('plain-token')).toThrow(/not encrypted/i);
  });
});
