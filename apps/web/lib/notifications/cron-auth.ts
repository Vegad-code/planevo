import { NextRequest } from 'next/server';

import { secureCompareString } from '@/lib/auth/secure-compare';

export function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  // Constant-time comparison to avoid leaking CRON_SECRET via timing.
  return secureCompareString(authHeader.slice(7), cronSecret);
}

export function getCronConfigStatus() {
  return {
    cron_secret_configured: !!process.env.CRON_SECRET,
    resend_api_key_configured: !!process.env.RESEND_API_KEY,
    email_from_configured: !!(process.env.EMAIL_FROM || process.env.WEEKLY_REVIEW_FROM),
    supabase_admin_configured: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  };
}
