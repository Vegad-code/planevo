import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { processReferral } from '@/lib/referral';
import type { Database } from '@/types/database';

function sanitizeNextPath(nextParam: string | null) {
  const next = nextParam ?? '/dashboard';
  return next.startsWith('/') ? next : '/dashboard';
}

function createRouteHandlerClient(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

async function maybeProcessReferral(
  userId: string,
  referralCode: string | null,
  userMetadata: Record<string, unknown> | undefined
) {
  const codeFromMetadata =
    typeof userMetadata?.referral_code === 'string' ? userMetadata.referral_code : null;
  const codeToProcess = referralCode || codeFromMetadata;

  if (
    !codeToProcess ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return;
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const result = await processReferral(admin, userId, codeToProcess);
  if (!result.success) {
    console.warn('[auth/callback] Referral processing skipped:', result.error);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = sanitizeNextPath(searchParams.get('next'));
  const referralCode = searchParams.get('ref');
  const failRedirect = `${origin}/login?error=auth_callback_failed`;

  if (tokenHash && type) {
    const successRedirect = `${origin}${next}`;
    const response = NextResponse.redirect(successRedirect);
    const supabase = createRouteHandlerClient(request, response);

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await maybeProcessReferral(user.id, referralCode, user.user_metadata);
      }
      return response;
    }

    console.warn('[auth/callback] verifyOtp failed:', error.message);
    return NextResponse.redirect(failRedirect);
  }

  if (code) {
    const successRedirect = `${origin}${next}`;
    const response = NextResponse.redirect(successRedirect);
    const supabase = createRouteHandlerClient(request, response);

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await maybeProcessReferral(user.id, referralCode, user.user_metadata);
      }
      return response;
    }

    console.warn('[auth/callback] exchangeCodeForSession failed:', error.message);
  }

  return NextResponse.redirect(failRedirect);
}
