import { NextRequest } from 'next/server';

export function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`;
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
