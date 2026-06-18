import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// summary.ts pulls in the Supabase admin + Composio clients at module load.
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {} }));
vi.mock('../composio/client', () => ({
  getActiveProProviders: vi.fn(),
}));
vi.mock('../accounts', () => ({
  upsertIntegrationAccount: vi.fn(),
}));

import { computeIsPro } from '../summary';

describe('computeIsPro', () => {
  const originalAdmins = process.env.BRUNO_ADMIN_EMAILS;

  beforeEach(() => {
    process.env.BRUNO_ADMIN_EMAILS = 'owner@planevo.app';
  });

  afterEach(() => {
    process.env.BRUNO_ADMIN_EMAILS = originalAdmins;
  });

  it('treats premium-like plans as Pro', () => {
    expect(computeIsPro('premium')).toBe(true);
    expect(computeIsPro('pro_monthly')).toBe(true);
    expect(computeIsPro('student')).toBe(true);
    expect(computeIsPro('trialing')).toBe(true);
  });

  it('treats free and canceled plans as non-Pro', () => {
    expect(computeIsPro('free')).toBe(false);
    expect(computeIsPro('canceled')).toBe(false);
    expect(computeIsPro(null)).toBe(false);
    expect(computeIsPro(undefined)).toBe(false);
  });

  it('grants Pro to admin-plan users only via the admin allowlist', () => {
    expect(computeIsPro('admin', 'owner@planevo.app')).toBe(true);
    expect(computeIsPro('admin', 'someone@else.com')).toBe(false);
    expect(computeIsPro('admin')).toBe(false);
  });

  it('is case-insensitive for admin emails', () => {
    expect(computeIsPro('admin', 'Owner@Planevo.app')).toBe(true);
  });
});
