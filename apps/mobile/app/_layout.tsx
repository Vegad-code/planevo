import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { Colors } from '@/constants/Colors';
import { registerForPushNotifications, scheduleMorningReminder } from '@/lib/notifications';

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

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  // Register for push notifications once authenticated
  useEffect(() => {
    if (!user) return;

    registerForPushNotifications(user.id).then(() => {
      scheduleMorningReminder(9, 0); // 9:00 AM local
    });

    // Handle notification tap → navigate to the right screen
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen === 'chat') {
          router.push('/(tabs)/chat');
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

const PlanPilotLightTheme = {
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

const PlanPilotDarkTheme = {
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

export default function RootLayout() {
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
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? PlanPilotDarkTheme : PlanPilotLightTheme}>
      <AuthGate>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </AuthGate>
    </ThemeProvider>
  );
}
