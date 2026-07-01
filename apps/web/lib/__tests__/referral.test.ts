import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  generateReferralCode,
  getReferralLink,
  getOrCreateReferralCode,
  processReferral,
} from '@/lib/referral';

describe('generateReferralCode', () => {
  it('returns a string starting with "PLAN-"', () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^PLAN-/);
  });

  it('returns a code with exactly 11 characters (PLAN- + 6)', () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(11);
  });

  it('suffix contains only lowercase alphanumeric characters', () => {
    const code = generateReferralCode();
    const suffix = code.slice(5);
    expect(suffix).toMatch(/^[a-z0-9]{6}$/);
  });

  it('generates different codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateReferralCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('getReferralLink', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses the NEXT_PUBLIC_APP_URL env var when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://my-app.example.com';
    const link = getReferralLink('PLAN-abc123');
    expect(link).toBe('https://my-app.example.com/signup?ref=PLAN-abc123');
  });

  it('falls back to https://planevo.co when env var is not set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const link = getReferralLink('PLAN-xyz789');
    expect(link).toBe('https://planevo.co/signup?ref=PLAN-xyz789');
  });

  it('includes the code in the ref query param', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const link = getReferralLink('PLAN-test42');
    expect(link).toContain('ref=PLAN-test42');
  });
});

describe('getOrCreateReferralCode', () => {
  it('returns existing code when user already has one', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { referral_code: 'PLAN-exists' }, error: null }),
          }),
        }),
      }),
    };
    const code = await getOrCreateReferralCode(supabase as never, 'user-1');
    expect(code).toBe('PLAN-exists');
  });

  it('generates and saves a new code when user has none', async () => {
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { referral_code: null }, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
    };
    const code = await getOrCreateReferralCode(supabase as never, 'user-1');
    expect(code).toMatch(/^PLAN-[a-z0-9]{6}$/);
  });

  it('throws after 5 failed retries', async () => {
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })
        .mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: 'collision' } }),
          }),
        }),
    };
    await expect(getOrCreateReferralCode(supabase as never, 'user-1')).rejects.toThrow(
      'Failed to generate unique referral code after 5 attempts'
    );
  });
});

describe('processReferral', () => {
  it('returns success when user was already referred', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { referred_by: 'existing-referrer' }, error: null }),
          }),
        }),
      }),
    };
    const result = await processReferral(supabase as never, 'user-2', 'PLAN-abc123');
    expect(result.success).toBe(true);
  });

  it('returns error when referral code is invalid', async () => {
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { referred_by: null }, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
    };
    const result = await processReferral(supabase as never, 'user-2', 'PLAN-invalid');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid referral code');
  });

  it('prevents self-referral', async () => {
    const supabase = {
      from: vi.fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { referred_by: null }, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'user-2' }, error: null }),
            }),
          }),
        }),
    };
    const result = await processReferral(supabase as never, 'user-2', 'PLAN-self');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot refer yourself');
  });
});
