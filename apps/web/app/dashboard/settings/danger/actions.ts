'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type DeleteAccountResult = {
  success: boolean;
  error?: string;
  redirectTo?: string;
};

type DeleteAccountProfile = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function getConfirmationTarget(email: string | undefined) {
  return email?.trim() || 'DELETE MY ACCOUNT';
}

async function cancelStripeBilling(profile: DeleteAccountProfile) {
  if (!profile.stripe_customer_id) {
    return;
  }

  const { stripe } = await import('@/lib/stripe');

  // Ensure all subscriptions are canceled before trying to delete the customer.
  // We let cancellation errors bubble up so billing isn't orphaned if it fails.
  const subscriptions = await stripe.subscriptions.list({
    customer: profile.stripe_customer_id,
    status: 'all',
  });

  for (const sub of subscriptions.data) {
    if (sub.status !== 'canceled') {
      await stripe.subscriptions.cancel(sub.id);
    }
  }

  // Attempt to delete the customer itself. Allowed to fail if Stripe retains history.
  try {
    await stripe.customers.del(profile.stripe_customer_id);
  } catch (error) {
    console.warn('[Account deletion] Stripe customer deletion skipped or failed:', error);
  }
}

export async function deleteAccountAction(confirmation: string): Promise<DeleteAccountResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'You must be signed in to delete your account.' };
    }

    const expectedConfirmation = getConfirmationTarget(user.email).toLowerCase();
    if (confirmation.trim().toLowerCase() !== expectedConfirmation) {
      return { success: false, error: 'The confirmation text does not match your account.' };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[Account deletion] Failed to load profile:', profileError);
      return { success: false, error: 'We could not prepare your account for deletion. Please try again.' };
    }

    const accountProfile = (profile || {
      id: user.id,
      email: user.email ?? null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    }) as DeleteAccountProfile;

    try {
      await cancelStripeBilling(accountProfile);
    } catch (error) {
      console.error('[Account deletion] Failed to cancel Stripe billing:', error);
      return {
        success: false,
        error: 'We could not cancel your billing subscription, so your account was not deleted. Please try again or cancel billing from Membership first.',
      };
    }

    const { error: referralCleanupError } = await supabaseAdmin
      .from('users')
      .update({ referred_by: null })
      .eq('referred_by', user.id);

    if (referralCleanupError) {
      console.error('[Account deletion] Failed to clear referral links:', referralCleanupError);
      return { success: false, error: 'We could not finish preparing your account for deletion. Please try again.' };
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[Account deletion] Failed to delete auth user:', deleteError);
      return { success: false, error: 'We could not delete your account. Please try again.' };
    }

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('[Account deletion] Deleted account but could not clear local session cookies:', error);
    }

    return { success: true, redirectTo: '/signup?account_deleted=1' };
  } catch (error) {
    console.error('[Account deletion] Unexpected failure:', error);
    return { success: false, error: 'Something went wrong while deleting your account.' };
  }
}
