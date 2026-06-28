import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { AppThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { Colors } from '@/constants/Colors';
import { syncPushNotificationState } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { PlanevoMobileLoader } from '@/components/branding/PlanevoMobileLoader';
import { initObservability, identifyUser, resetUser, sentryWrap } from '@/lib/observability';
import { normalizePlanType } from '@/lib/plan-types';
import { initRevenueCat, loginToRevenueCat, isPro, logoutOfRevenueCat } from '@/lib/revenuecat';

// Initialize observability at module scope (before any render)
initObservability();
void initRevenueCat().catch((error) => {
  console.warn('[revenuecat] Failed to initialize:', error);
});

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const notificationResponseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);
  const isVerifying = useRef(false);

  const [loaderMode, setLoaderMode] = useState<'loading' | 'complete'>('loading');
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (!user) {
      isVerifying.current = false;
      resetUser();
      logoutOfRevenueCat();
    }
  }, [user]);

  const resolveAuthenticatedRoute = async (
    userId: string,
    userEmail: string | undefined,
    inAuthGroup: boolean,
    isBlockedRoute: boolean
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('plan_type')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return inAuthGroup || isBlockedRoute ? '/(tabs)' : null;
      }

      const normalizedPlan = normalizePlanType(data.plan_type);
      const customerInfo = await loginToRevenueCat(userId, userEmail);
      const isRcPro = isPro(customerInfo);
      const isPlanActive =
        ['free', 'trialing', 'premium', 'student', 'admin'].includes(normalizedPlan) || isRcPro;

      if (isPlanActive) {
        identifyUser(userId, userEmail, normalizedPlan);
      }

      if (inAuthGroup || isBlockedRoute) {
        return '/(tabs)';
      }

      if (!isPlanActive) {
        return '/(tabs)';
      }

      return null;
    } catch {
      return inAuthGroup || isBlockedRoute ? '/(tabs)' : null;
    }
  };

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'forgot-password';
    const isBlockedRoute = (segments[0] as string) === 'blocked';

    if (!showLoader) {
      if (!session && !inAuthGroup) {
        router.replace('/login');
        return;
      }

      if (session && user) {
        if (isVerifying.current) return;
        isVerifying.current = true;

        void (async () => {
          try {
            const route = await resolveAuthenticatedRoute(
              user.id,
              user.email ?? undefined,
              inAuthGroup,
              isBlockedRoute
            );
            if (route) {
              router.replace(route as never);
            }
          } finally {
            isVerifying.current = false;
          }
        })();
      }
      return;
    }

    const finishAuth = (route: string | null) => {
      setTargetRoute(route);
      setLoaderMode('complete');
    };

    if (!session && !inAuthGroup) {
      finishAuth('/login');
      return;
    }

    if (!session && inAuthGroup) {
      finishAuth(null);
      return;
    }

    if (session && user) {
      if (isVerifying.current) return;
      isVerifying.current = true;

      void (async () => {
        try {
          const route = await resolveAuthenticatedRoute(
            user.id,
            user.email ?? undefined,
            inAuthGroup,
            isBlockedRoute
          );
          finishAuth(route);
        } finally {
          isVerifying.current = false;
        }
      })();
    }
  }, [session, loading, segments, user, showLoader, router]);

  // Register for push notifications once authenticated
  useEffect(() => {
    if (!user) return;

    syncPushNotificationState(user.id);

    // Handle notification tap → navigate to the right screen
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        const screen = typeof data?.screen === 'string' ? data.screen : null;

        if (screen === 'chat') {
          const prompt = typeof data?.prompt === 'string' ? data.prompt : undefined;
          if (prompt) {
            router.push({ pathname: '/(tabs)/chat', params: { prompt } } as never);
          } else {
            router.push('/(tabs)/chat');
          }
        } else if (screen === 'tasks') {
          router.push('/(tabs)/tasks');
        } else if (screen === 'calendar') {
          const eventId = typeof data?.eventId === 'string' ? data.eventId : undefined;
          if (eventId) {
            router.push({ pathname: '/(tabs)/calendar', params: { eventId } } as never);
          } else {
            router.push('/(tabs)/calendar');
          }
        } else if (screen === 'notifications') {
          router.push('/notifications-inbox');
        } else if (screen === 'settings') {
          router.push('/notifications-settings');
        } else {
          router.push('/(tabs)');
        }
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [user, router]);

  const handleAnimationFinished = () => {
    setShowLoader(false);
    if (targetRoute) {
      router.replace(targetRoute as never);
    }
  };

  if (showLoader) {
    return <PlanevoMobileLoader mode={loaderMode} onAnimationFinished={handleAnimationFinished} />;
  }

  return <>{children}</>;
}

const PlanevoLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.brand[500],
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.cardBorder,
    notification: Colors.brand[500],
  },
};

const PlanevoDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.brand[300],
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.cardBorder,
    notification: Colors.brand[300],
  },
};

function RootExport() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AppThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </AppThemeProvider>
  );
}

export default sentryWrap(RootExport);

function RootLayoutNav() {
  const { isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? PlanevoDarkTheme : PlanevoLightTheme}>
        <AuthGate>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="change-password" options={{ headerShown: false }} />
            <Stack.Screen name="blocked" options={{ headerShown: false }} />
            <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="canvas-connect" options={{ presentation: 'modal', title: 'Connect Canvas' }} />
            <Stack.Screen name="notifications-settings" options={{ headerShown: false }} />
            <Stack.Screen name="notifications-inbox" options={{ headerShown: false }} />
          </Stack>
        </AuthGate>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
