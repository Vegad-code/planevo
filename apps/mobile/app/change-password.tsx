import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { getApiUrl } from '@/lib/api';

function userHasEmailPassword(user: { app_metadata?: { provider?: string }; identities?: { provider: string }[] } | null): boolean {
  if (!user) return false;
  const hasEmailIdentity = user.identities?.some((identity) => identity.provider === 'email') ?? false;
  const provider = user.app_metadata?.provider;
  return hasEmailIdentity || provider === 'email';
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, session } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const canChangePassword = useMemo(() => userHasEmailPassword(user), [user]);

  const handleSubmit = async () => {
    if (!session?.access_token) {
      Alert.alert('Session expired', 'Please sign in again.');
      router.replace('/login');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please confirm your new password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        Alert.alert('Could not change password', data.error || 'Please try again.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Password updated',
        'Your password was changed. We sent a confirmation email to your inbox.'
      );
    } catch {
      Alert.alert('Could not change password', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2.5} />
            <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Change password</Text>

          {!canChangePassword ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              You sign in with Google, so there is no Planevo password to change here. To add a
              password, use forgot password on the login screen with your account email.
            </Text>
          ) : (
            <>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Enter your current password, then choose a new one. We&apos;ll email you when it
                changes.
              </Text>

              <PasswordField
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                colors={colors}
              />
              <PasswordField
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                colors={colors}
              />
              <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                colors={colors}
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: Colors.brand[600] }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitText}>Update password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: { text: string; textMuted: string; inputBackground: string; inputBorder: string };
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <Lock size={18} color={colors.textMuted} strokeWidth={2.5} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  backText: { fontSize: 15, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 24 },
  fieldBlock: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
