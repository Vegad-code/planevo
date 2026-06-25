import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';
import { isAllowedOrigin } from '@/lib/auth/origin-guard';
import { AUTH_IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/auth/ip-rate-limit';
import { authSignInBodySchema } from '@/lib/api/schemas';
import { createLogger } from '@/lib/logger';
import { logSecurityAudit } from '@/lib/security-audit';

const log = createLogger({ route: '/api/auth/sign-in' });

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const rateLimit = await checkIpRateLimit(request, AUTH_IP_RATE_LIMITS.signIn);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Please try again later.' },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = authSignInBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
  }

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

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    await logSecurityAudit({
      actorUserId: null,
      action: 'auth.sign_in_failed',
      metadata: { email: parsed.data.email },
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    });
    log.warn('sign-in failed', { email: parsed.data.email });
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  log.info('sign-in success');
  return response;
}
