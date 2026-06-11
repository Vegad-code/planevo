import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generate a short, URL-safe referral code.
 * Format: PLAN-{6 random alphanumeric chars}
 */
export function generateReferralCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PLAN-${suffix}`;
}

/**
 * Get or create a referral code for the given user.
 */
export async function getOrCreateReferralCode(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  // Check if user already has a code
  const { data: user } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single();

  if (user?.referral_code) {
    return user.referral_code;
  }

  // Generate a new unique code
  let code = generateReferralCode();
  let retries = 0;

  while (retries < 5) {
    const { error } = await supabase
      .from('users')
      .update({ referral_code: code })
      .eq('id', userId);

    if (!error) return code;

    // Collision — try again
    code = generateReferralCode();
    retries++;
  }

  throw new Error('Failed to generate unique referral code after 5 attempts');
}

/**
 * Build a full referral link from a code.
 */
export function getReferralLink(code: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://planevo.co';
  return `${baseUrl}/signup?ref=${code}`;
}

/**
 * Process a referral after a new user signs up.
 * Links the referred user to the referrer and creates a referral record.
 */
export async function processReferral(
  supabase: SupabaseClient,
  referredUserId: string,
  referralCode: string
): Promise<{ success: boolean; error?: string }> {
  const { data: referredUser } = await supabase
    .from('users')
    .select('referred_by')
    .eq('id', referredUserId)
    .single();

  if (referredUser?.referred_by) {
    return { success: true };
  }

  // Look up the referrer by their code
  const { data: referrer } = await supabase
    .from('users')
    .select('id')
    .eq('referral_code', referralCode)
    .single();

  if (!referrer) {
    return { success: false, error: 'Invalid referral code' };
  }

  // Don't let users refer themselves
  if (referrer.id === referredUserId) {
    return { success: false, error: 'Cannot refer yourself' };
  }

  // Update the referred user
  await supabase
    .from('users')
    .update({ referred_by: referrer.id })
    .eq('id', referredUserId);

  // Create the referral record
  const { error } = await supabase
    .from('referrals')
    .upsert({
      referrer_id: referrer.id,
      referred_id: referredUserId,
      status: 'pending',
    }, { onConflict: 'referrer_id,referred_id' });

  if (error) {
    console.error('[referral] Failed to create referral record:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get referral stats for a user (as a referrer).
 */
export async function getReferralStats(
  supabase: SupabaseClient,
  userId: string
): Promise<{ total: number; converted: number; pending: number }> {
  const { data: referrals } = await supabase
    .from('referrals')
    .select('status')
    .eq('referrer_id', userId);

  if (!referrals) return { total: 0, converted: 0, pending: 0 };

  return {
    total: referrals.length,
    converted: referrals.filter(r => r.status === 'converted').length,
    pending: referrals.filter(r => r.status === 'pending').length,
  };
}
