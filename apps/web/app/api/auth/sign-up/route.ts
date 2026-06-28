import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';
import { isAllowedOrigin } from '@/lib/auth/origin-guard';
import { AUTH_IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/auth/ip-rate-limit';
import { authSignUpBodySchema } from '@/lib/api/schemas';

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const rateLimit = await checkIpRateLimit(request, AUTH_IP_RATE_LIMITS.signUp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-up attempts. Please try again later.' },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = authSignUpBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid sign-up details.' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const nextPath = parsed.data.nextPath?.startsWith('/') ? parsed.data.nextPath : '/dashboard';
  const referralQuery = parsed.data.referralCode
    ? `&ref=${encodeURIComponent(parsed.data.referralCode)}`
    : '';

  let response = NextResponse.json({ success: true });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.json({ success: true });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.name,
        referral_code: parsed.data.referralCode,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}${referralQuery}`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}
