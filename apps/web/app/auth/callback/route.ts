import { createClient } from '@/lib/supabase/server';
import { processReferral } from '@/lib/referral';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/dashboard';
  const next = nextParam.startsWith('/') ? nextParam : '/dashboard';
  const referralCode = searchParams.get('ref');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const codeFromMetadata = typeof user?.user_metadata?.referral_code === 'string'
        ? user.user_metadata.referral_code
        : null;
      const codeToProcess = referralCode || codeFromMetadata;

      if (
        user &&
        codeToProcess &&
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        const admin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );
        const result = await processReferral(admin, user.id, codeToProcess);
        if (!result.success) {
          console.warn('[auth/callback] Referral processing skipped:', result.error);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
