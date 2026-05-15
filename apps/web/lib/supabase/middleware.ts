import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
  if (user && !['/', '/onboarding', '/pricing'].includes(request.nextUrl.pathname) && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/_next')) {
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_complete, plan_type')
      .eq('id', user.id)
      .single();

    if (profile) {
      const planType = profile.plan_type || 'free';
      const onboardingComplete = !!profile.onboarding_complete;
      const isAdminEmail = user.email === 'jabbouranthony720@gmail.com';
      const isActive = ['pro_monthly', 'pro_annual', 'trialing', 'premium'].includes(planType) || (planType === 'admin' && isAdminEmail) || isAdminEmail;

      console.log(`[Middleware] User: ${user.email}, Onboarding: ${onboardingComplete}, Plan: ${planType}, Active: ${isActive}`);

      if (isAdminEmail) {
        return supabaseResponse;
      }

      if (!onboardingComplete) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      } else if (!isActive) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      }
    } else {
      console.log(`[Middleware] No profile found for ${user.email}`);
    }
  }

  return supabaseResponse;
}
