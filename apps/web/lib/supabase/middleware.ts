import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const isPublicApp = !request.nextUrl.pathname.startsWith('/dashboard');
  const requestHeaders = new Headers(request.headers);
  if (isPublicApp) {
    requestHeaders.set('x-planevo-public', 'true');
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — important for Server Components
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  } catch (e) {
    console.error('[Middleware] Auth session refresh failed:', e instanceof Error ? e.message : e);
  }

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/landing-v2',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/pricing',
    '/terms',
    '/privacy',
    '/cookies',
    '/api/auth/password-reset',
    '/api/auth/recovery-session',
    '/api/auth/sign-in',
    '/api/auth/sign-up',
  ];

  const isPublicRoute =
    publicRoutes.includes(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith('/auth/callback/');

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    // We no longer block /api routes in the middleware because mobile clients use Bearer tokens
    // instead of cookies. The API route handlers themselves are responsible for calling 
    // getAuthenticatedUser() to verify both cookies and Bearer tokens.
    if (request.nextUrl.pathname.startsWith('/api')) {
      return supabaseResponse;
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Removed auto-redirect from auth pages so users can sign into another account if they choose

  return supabaseResponse;
}
