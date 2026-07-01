import { describe, expect, it } from 'vitest';
import {
  isPrivateIp,
  isAllowedCanvasUrl,
  assertCanvasUrlSafe,
  type CanvasUrlResolver,
} from '@/lib/canvas/url-validation';

describe('isPrivateIp', () => {
  it('flags loopback and private IPv4 ranges', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('10.1.2.3')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('169.254.10.10')).toBe(true);
    expect(isPrivateIp('100.64.0.1')).toBe(true);
    expect(isPrivateIp('0.0.0.0')).toBe(true);
    expect(isPrivateIp('224.0.0.1')).toBe(true);
  });

  it('allows public IPv4 addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
    expect(isPrivateIp('172.32.0.1')).toBe(false);
    expect(isPrivateIp('93.184.216.34')).toBe(false);
  });

  it('flags private/loopback IPv6 and mapped IPv4', () => {
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('fe80::1')).toBe(true);
    expect(isPrivateIp('fc00::1')).toBe(true);
    expect(isPrivateIp('fd12:3456::1')).toBe(true);
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
  });

  it('allows public IPv6 and treats non-IPs as unsafe', () => {
    expect(isPrivateIp('2606:4700:4700::1111')).toBe(false);
    expect(isPrivateIp('not-an-ip')).toBe(true);
  });
});

describe('isAllowedCanvasUrl (sync)', () => {
  it('accepts well-formed public HTTPS URLs', () => {
    expect(isAllowedCanvasUrl('https://canvas.instructure.com')).toBe(true);
    expect(isAllowedCanvasUrl('https://university.instructure.com/')).toBe(true);
  });

  it('rejects non-HTTPS in production', () => {
    expect(isAllowedCanvasUrl('http://canvas.instructure.com')).toBe(false);
    expect(isAllowedCanvasUrl('ftp://canvas.instructure.com')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isAllowedCanvasUrl('not a url')).toBe(false);
    expect(isAllowedCanvasUrl('')).toBe(false);
  });

  it('rejects obvious private hosts and IP literals', () => {
    expect(isAllowedCanvasUrl('https://localhost')).toBe(false);
    expect(isAllowedCanvasUrl('https://foo.local')).toBe(false);
    expect(isAllowedCanvasUrl('https://foo.internal')).toBe(false);
    expect(isAllowedCanvasUrl('https://127.0.0.1')).toBe(false);
    expect(isAllowedCanvasUrl('https://10.0.0.5')).toBe(false);
    expect(isAllowedCanvasUrl('https://[::1]')).toBe(false);
  });
});

describe('assertCanvasUrlSafe (async, DNS)', () => {
  const resolvePublic: CanvasUrlResolver = async () => [{ address: '93.184.216.34' }];
  const resolvePrivate: CanvasUrlResolver = async () => [{ address: '10.0.0.5' }];
  const resolveMixed: CanvasUrlResolver = async () => [
    { address: '93.184.216.34' },
    { address: '127.0.0.1' },
  ];
  const resolveEmpty: CanvasUrlResolver = async () => [];
  const resolveThrows: CanvasUrlResolver = async () => {
    throw new Error('ENOTFOUND');
  };

  it('accepts a host that resolves to a public address', async () => {
    const result = await assertCanvasUrlSafe('https://canvas.instructure.com/', resolvePublic);
    expect(result).toEqual({ ok: true, url: 'https://canvas.instructure.com' });
  });

  it('rejects a host that resolves to a private address', async () => {
    const result = await assertCanvasUrlSafe('https://evil.example.com', resolvePrivate);
    expect(result.ok).toBe(false);
  });

  it('rejects when ANY resolved address is private (DNS rebinding style)', async () => {
    const result = await assertCanvasUrlSafe('https://evil.example.com', resolveMixed);
    expect(result.ok).toBe(false);
  });

  it('rejects when the host does not resolve', async () => {
    const result = await assertCanvasUrlSafe('https://ghost.example.com', resolveEmpty);
    expect(result.ok).toBe(false);
  });

  it('rejects when DNS resolution throws', async () => {
    const result = await assertCanvasUrlSafe('https://ghost.example.com', resolveThrows);
    expect(result.ok).toBe(false);
  });

  it('rejects invalid/disallowed URLs before resolving', async () => {
    const result = await assertCanvasUrlSafe('http://localhost', resolvePublic);
    expect(result.ok).toBe(false);
  });

  it('accepts a public IP literal without DNS resolution', async () => {
    const result = await assertCanvasUrlSafe('https://93.184.216.34', resolveThrows);
    expect(result).toEqual({ ok: true, url: 'https://93.184.216.34' });
  });
});
