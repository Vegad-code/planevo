import { NextRequest, NextResponse } from 'next/server';

import { sendPasswordResetEmail } from '@/lib/email';
import {
  hasNotificationDelivery,
  recordNotificationDelivery,
} from '@/lib/notifications/delivery';
import { supabaseAdmin } from '@/lib/supabase/admin';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAppOrigin(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    // Keep the response identical whether the account exists or not.
    if (!profile) {
      return NextResponse.json({ success: true });
    }

    const dedupeKey = `five-minute-${Math.floor(Date.now() / (5 * 60 * 1000))}`;
    if (await hasNotificationDelivery(supabaseAdmin, profile.id, 'password_reset', 'email', dedupeKey)) {
      return NextResponse.json({ success: true });
    }

    const redirectTo = `${getAppOrigin(request)}/auth/callback?next=${encodeURIComponent('/reset-password')}`;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    if (error) {
      // Do not leak whether an email is registered.
      console.warn('[password-reset] Recovery link generation skipped:', error.message);
      return NextResponse.json({ success: true });
    }

    const actionLink = data.properties?.action_link;
    if (!actionLink) {
      console.error('[password-reset] Supabase did not return a recovery action link.');
      return NextResponse.json({ error: 'Password reset email could not be prepared.' }, { status: 500 });
    }

    await sendPasswordResetEmail(email, actionLink);
    await recordNotificationDelivery(
      supabaseAdmin,
      profile.id,
      'password_reset',
      'email',
      dedupeKey
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[password-reset] Failed to send password reset email:', error);
    return NextResponse.json({ error: 'Password reset email could not be sent.' }, { status: 500 });
  }
}
