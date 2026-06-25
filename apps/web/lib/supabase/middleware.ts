import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
            request,
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
    console.error('Middleware Auth Error:', e);
  }

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/onboarding',
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

  // Onboarding & Subscription Gate: Protect the app from unauthorized access
  // Database checks have been moved to the client/layout level to prevent blocking navigation.
  if (user && !['/', '/onboarding', '/pricing'].includes(request.nextUrl.pathname) && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/_next')) {
    // If we wanted to enforce strict server-side redirects without DB queries,
    // we would check for a JWT claim or a custom cookie here.
    // For now, we allow the request to proceed to the DashboardLayout which performs the onboarding check securely.
  }

  return supabaseResponse;
}
