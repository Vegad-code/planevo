import { NextRequest, NextResponse } from 'next/server';

import { buildEmailIdempotencyKey, sendPasswordResetEmail } from '@/lib/email';
import {
  hasNotificationDelivery,
  recordNotificationDelivery,
} from '@/lib/notifications/delivery';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isAllowedOriginOrMobileClient } from '@/lib/auth/origin-guard';
import { AUTH_IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/auth/ip-rate-limit';
import { authPasswordResetBodySchema } from '@/lib/api/schemas';
import { logSecurityAudit } from '@/lib/security-audit';
import { createLogger } from '@/lib/logger';
import { buildRecoveryCallbackUrl } from '@/lib/auth/recovery-link';

const log = createLogger({ route: '/api/auth/password-reset' });

function getAppOrigin(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return new URL(request.url).origin;
  }
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOriginOrMobileClient(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const rateLimit = await checkIpRateLimit(request, AUTH_IP_RATE_LIMITS.passwordReset);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds
            ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = authPasswordResetBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const appOrigin = getAppOrigin(request);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (linkError || !linkData?.user?.id) {
      log.warn('recovery link generation skipped', { reason: linkError?.message ?? 'missing user' });
      return NextResponse.json({ success: true });
    }

    const userId = linkData.user.id;
    const hashedToken = linkData.properties?.hashed_token;
    const resetLink = hashedToken
      ? buildRecoveryCallbackUrl(appOrigin, hashedToken)
      : linkData.properties?.action_link;

    if (!resetLink) {
      log.error('supabase did not return a recovery token or action link');
      return NextResponse.json({ error: 'Password reset email could not be prepared.' }, { status: 500 });
    }

    const dedupeWindowMs = process.env.NODE_ENV === 'development' ? 60_000 : 5 * 60_000;
    const dedupeKey = `password-reset-${Math.floor(Date.now() / dedupeWindowMs)}`;
    if (await hasNotificationDelivery(supabaseAdmin, userId, 'password_reset', 'email', dedupeKey)) {
      log.info('password reset deduped', { userId });
      return NextResponse.json({ success: true });
    }

    if (process.env.NODE_ENV === 'development') {
      log.info('dev password reset link', { resetLink });
    }

    const providerMessageId = await sendPasswordResetEmail(email, resetLink, {
      idempotencyKey: buildEmailIdempotencyKey('password_reset', 'email', userId, dedupeKey),
    });

    await recordNotificationDelivery(
      supabaseAdmin,
      userId,
      'password_reset',
      'email',
      dedupeKey,
      { provider: 'resend', provider_message_id: providerMessageId ?? null }
    );

    await logSecurityAudit({
      actorUserId: userId,
      action: 'auth.password_reset',
      resourceType: 'user',
      resourceId: userId,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    });

    log.info('password reset email sent', { userId, providerMessageId });

    const responseBody: { success: true; devResetLink?: string } = { success: true };
    if (process.env.NODE_ENV === 'development') {
      responseBody.devResetLink = resetLink;
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    log.error('failed to send password reset email', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Password reset email could not be sent.' }, { status: 500 });
  }
}
