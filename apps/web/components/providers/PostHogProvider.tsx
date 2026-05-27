'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PostHogProvider as ReactPostHogProvider } from 'posthog-js/react';
import { initPostHog, posthog } from '@/lib/posthog';
import { createClient } from '@/lib/supabase/client';
import * as Sentry from '@sentry/nextjs';

/**
 * PostHogProvider
 *
 * Wraps the app to initialise PostHog on mount and track
 * page views on every client-side navigation.
 *
 * Call `posthog.identify(userId, { email, plan_type })` from
 * your auth flow to tie events to a person.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Init once
  useEffect(() => {
    initPostHog();

    const supabase = createClient();
    let cancelled = false;

    const identifyUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        posthog.reset();
        Sentry.setUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('plan_type')
        .eq('id', user.id)
        .maybeSingle();

      if (!cancelled) {
        const planType = profile?.plan_type ?? 'free';
        posthog.identify(user.id, {
          email: user.email,
          plan_type: planType,
        });
        Sentry.setUser({ id: user.id, email: user.email || undefined });
        Sentry.setTag('plan_type', planType);
      }
    };

    void identifyUser();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        posthog.reset();
        Sentry.setUser(null);
        return;
      }
      void identifyUser();
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Track page views on client-side navigations
  useEffect(() => {
    if (!pathname) return;
    const url = window.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return <ReactPostHogProvider client={posthog}>{children}</ReactPostHogProvider>;
}
