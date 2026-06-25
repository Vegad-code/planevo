import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { getApiUrl } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Planevo-Client': 'mobile',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Could not send reset email. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Could not send reset email. Please try again.');
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
        <View style={styles.inner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2.5} />
            <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>

          {success ? (
            <View style={styles.successBlock}>
              <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                If an account exists for {email}, we sent a password reset link. Open it in your
                browser to choose a new password.
              </Text>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: Colors.brand[600] }]}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.submitText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Reset password</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Enter your email and we&apos;ll send a reset link.
              </Text>

              {error && (
                <View style={[styles.errorBox, { borderColor: Colors.error }]}>
                  <Text style={[styles.errorText, { color: Colors.error }]}>{error}</Text>
                </View>
              )}

              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                <Mail size={18} color={colors.textMuted} strokeWidth={2.5} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: Colors.brand[600] }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitText}>Send reset link</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  backText: { fontSize: 15, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 24 },
  errorBox: { borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    marginTop: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  successBlock: { flex: 1, justifyContent: 'center', gap: 8, paddingBottom: 80 },
});
