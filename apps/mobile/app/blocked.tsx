import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { LogOut, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

export default function BlockedScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleCheckAgain = () => {
    // A simple reload to trigger the AuthGate re-check
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: Colors.brand[50] }]}>
          <AlertCircle size={48} color={Colors.brand[500]} strokeWidth={2} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Setup Required</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Please renew your subscription on the Planevo web app before using the mobile companion.
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.brand[600] }]}
            onPress={() => {
              Linking.openURL(process.env.EXPO_PUBLIC_WEB_URL ?? 'https://planevo.co');
            }}
          >
            <ExternalLink size={18} color="#fff" strokeWidth={2.5} />
            <Text style={styles.buttonText}>Open Web App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonOutlined, { borderColor: Colors.brand[300] }]}
            onPress={handleCheckAgain}
          >
            <RefreshCw size={18} color={Colors.brand[500]} strokeWidth={2.5} />
            <Text style={[styles.buttonTextOutlined, { color: Colors.brand[500] }]}>Check Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonOutlined, { borderColor: Colors.error }]}
            onPress={signOut}
          >
            <LogOut size={18} color={Colors.error} strokeWidth={2.5} />
            <Text style={[styles.buttonTextOutlined, { color: Colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonOutlined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
  },
  buttonTextOutlined: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
