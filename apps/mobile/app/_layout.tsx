import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { AppThemeProvider, useTheme } from '@/providers/ThemeProvider';
import { Colors } from '@/constants/Colors';
import { syncPushNotificationState } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { initObservability, identifyUser, resetUser, sentryWrap } from '@/lib/observability';
import { normalizePlanType } from '@/lib/plan-types';

// Initialize observability at module scope (before any render)
initObservability();

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
  const profileStatus = useRef<'unknown' | 'ready' | 'blocked'>('unknown');

  useEffect(() => {
    if (!user) {
      profileStatus.current = 'unknown';
      isVerifying.current = false;
      resetUser();
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';
    const isBlockedRoute = (segments[0] as string) === 'blocked';

    if (!session && !inAuthGroup) {
      router.replace('/login');
      return;
    }

    if (session && user) {
      if (profileStatus.current === 'unknown') {
        if (isVerifying.current) return;
        isVerifying.current = true;

        const verifyProfile = async () => {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('onboarding_complete, plan_type')
              .eq('id', user.id)
              .single();

            isVerifying.current = false;
            if (error || !data) {
              profileStatus.current = 'blocked';
              router.replace('/blocked' as any);
              return;
            }

            const normalizedPlan = normalizePlanType(data.plan_type);
            const isPlanActive = ['free', 'trialing', 'premium', 'student', 'admin'].includes(
              normalizedPlan
            );
            const isReady = data.onboarding_complete && isPlanActive;

            if (isReady) {
              profileStatus.current = 'ready';
              identifyUser(user.id, user.email ?? undefined, normalizedPlan);
              if (inAuthGroup || isBlockedRoute) {
                router.replace('/(tabs)');
              }
            } else {
              profileStatus.current = 'blocked';
              if (!isBlockedRoute) {
                router.replace('/blocked' as any);
              }
            }
          } catch (err) {
            isVerifying.current = false;
          }
        };
        verifyProfile();
      } else {
        if (profileStatus.current === 'ready' && (inAuthGroup || isBlockedRoute)) {
          router.replace('/(tabs)');
        } else if (profileStatus.current === 'blocked' && !isBlockedRoute && !inAuthGroup) {
          router.replace('/blocked' as any);
        }
      }
    }
  }, [session, loading, segments, user]);

  // Register for push notifications once authenticated
  useEffect(() => {
    if (!user) return;

    syncPushNotificationState(user.id);

    // Handle notification tap → navigate to the right screen
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen === 'chat') {
          router.push('/(tabs)/chat');
        } else if (screen === 'settings') {
          router.push('/(tabs)/settings');
        } else {
          router.push('/(tabs)');
        }
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [user]);

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
            <Stack.Screen name="blocked" options={{ headerShown: false }} />
            <Stack.Screen name="canvas-connect" options={{ presentation: 'modal', title: 'Connect Canvas' }} />
          </Stack>
        </AuthGate>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
