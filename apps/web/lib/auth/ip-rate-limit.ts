import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type IpRateLimitConfig = {
  bucket: string;
  maxAttempts: number;
  windowSeconds: number;
};

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

export async function checkIpRateLimit(
  request: NextRequest,
  config: IpRateLimitConfig
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const ip = getClientIp(request);
  const bucketKey = `${config.bucket}:${ip}`;

  try {
    const { data, error } = await supabaseAdmin.rpc('consume_ip_rate_limit', {
      p_bucket_key: bucketKey,
      p_max_attempts: config.maxAttempts,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.error('[ip-rate-limit] RPC failed (failing open):', error);
      return { allowed: true };
    }

    if (data === true) {
      return { allowed: true };
    }

    return { allowed: false, retryAfterSeconds: config.windowSeconds };
  } catch (error) {
    console.error('[ip-rate-limit] Unexpected failure (failing open):', error);
    return { allowed: true };
  }
}

export const AUTH_IP_RATE_LIMITS = {
  passwordReset: { bucket: 'auth:password-reset', maxAttempts: 5, windowSeconds: 900 },
  changePassword: { bucket: 'auth:change-password', maxAttempts: 5, windowSeconds: 900 },
  signIn: { bucket: 'auth:sign-in', maxAttempts: 10, windowSeconds: 900 },
  signUp: { bucket: 'auth:sign-up', maxAttempts: 5, windowSeconds: 3600 },
} as const satisfies Record<string, IpRateLimitConfig>;
