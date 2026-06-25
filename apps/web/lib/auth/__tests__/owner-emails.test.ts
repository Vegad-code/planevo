import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('owner-emails', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads PLANEVO_OWNER_EMAILS', async () => {
    vi.stubEnv('PLANEVO_OWNER_EMAILS', 'Owner@Example.com, admin@test.com');
    const { getOwnerEmails, isOwnerEmail } = await import('@/lib/auth/owner-emails');
    expect(getOwnerEmails()).toEqual(['owner@example.com', 'admin@test.com']);
    expect(isOwnerEmail('Owner@Example.com')).toBe(true);
    expect(isOwnerEmail('other@test.com')).toBe(false);
  });

  it('falls back to BRUNO_ADMIN_EMAILS', async () => {
    vi.stubEnv('BRUNO_ADMIN_EMAILS', 'bruno@planevo.co');
    const { getOwnerEmails } = await import('@/lib/auth/owner-emails');
    expect(getOwnerEmails()).toEqual(['bruno@planevo.co']);
  });
});
