import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { authChangePasswordBodySchema } from '@/lib/api/schemas';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { AUTH_IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/auth/ip-rate-limit';
import { sendPasswordChangedEmail } from '@/lib/email';
import { logSecurityAudit } from '@/lib/security-audit';

function userHasEmailPassword(authUser: {
  email?: string;
  identities?: { provider: string }[];
  app_metadata?: { provider?: string };
}): boolean {
  const hasEmailIdentity = authUser.identities?.some((identity) => identity.provider === 'email') ?? false;
  const provider = authUser.app_metadata?.provider;
  return hasEmailIdentity || provider === 'email';
}

export async function POST(request: NextRequest) {
  if (!isAllowedOriginOrBearer(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const rateLimit = await checkIpRateLimit(request, AUTH_IP_RATE_LIMITS.changePassword);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many password change attempts. Please try again later.' },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = authChangePasswordBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid current and new password.' }, { status: 400 });
  }

  const authResult = await createAuthenticatedSupabaseClient(request);
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { supabase, user } = authResult;

  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
  if (userError || !authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!userHasEmailPassword(authUser)) {
    return NextResponse.json(
      { error: 'Password changes are not available for Google sign-in accounts.' },
      { status: 400 }
    );
  }

  const email = authUser.email ?? user.email;
  if (!email) {
    return NextResponse.json({ error: 'No email address is linked to this account.' }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: 'New password must be different from your current password.' },
      { status: 400 }
    );
  }

  const verifyClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  try {
    await sendPasswordChangedEmail(email, {
      userAgent: request.headers.get('user-agent'),
    });
  } catch (error) {
    console.error('[change-password] Password changed but notification email failed:', error);
  }

  await logSecurityAudit({
    actorUserId: user.id,
    action: 'auth.password_changed',
    resourceType: 'user',
    resourceId: user.id,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  });

  await supabase.auth.signOut({ scope: 'others' });

  return NextResponse.json({ success: true });
}
