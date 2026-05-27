import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizePlanType } from '@/lib/auth/plan-types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/auth/callback', '/onboarding', '/pricing'];

  const isPublicRoute = publicRoutes.some(
    (route) => request.nextUrl.pathname === route
  );

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    // Check if it's an API request
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (user && ['/login', '/signup', '/forgot-password'].includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Onboarding & Subscription Gate: Protect the app from unauthorized access
  // Database checks have been moved to the client/layout level to prevent blocking navigation.
  if (user && !['/', '/onboarding', '/pricing'].includes(request.nextUrl.pathname) && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/_next')) {
    // If we wanted to enforce strict server-side redirects without DB queries,
    // we would check for a JWT claim or a custom cookie here.
    // For now, we allow the request to proceed to the DashboardLayout which performs the onboarding check securely.
  }

  return supabaseResponse;
}
