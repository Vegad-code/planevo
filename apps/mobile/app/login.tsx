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
  Alert,
} from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { colors, isDark } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (isSignUp && !name) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email, password, name)
        : await signIn(email, password);

      if (error) {
        Alert.alert('Error', error.message);
      } else if (isSignUp) {
        Alert.alert('Check your email', 'We sent you a confirmation link.');
      }
    } finally {
      setLoading(false);
    }
  };

  const timeOfDay = new Date().getHours();
  const greeting = timeOfDay < 12 ? 'Good morning' : timeOfDay < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: Colors.brand[500] }]}>
            <Text style={styles.logoText}>PP</Text>
          </View>
          <Text style={[styles.brandName, { color: colors.text }]}>
            Plan Pilot
          </Text>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {greeting}. {isSignUp ? 'Let\'s get you set up.' : 'Welcome back.'}
          </Text>
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <User size={18} color={colors.textMuted} strokeWidth={2.5} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Full name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                testID="auth-name-input"
              />
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
              testID="auth-email-input"
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Lock size={18} color={colors.textMuted} strokeWidth={2.5} />
            <TextInput
              style={[styles.input, { color: colors.text, flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              testID="auth-password-input"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} testID="auth-toggle-password">
              {showPassword ? (
                <EyeOff size={18} color={colors.textMuted} strokeWidth={2.5} />
              ) : (
                <Eye size={18} color={colors.textMuted} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: Colors.brand[600] }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            testID="auth-submit-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
                <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          style={styles.toggleButton}
          testID="auth-toggle-mode"
        >
          <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
            {isSignUp ? 'Already have an account? ' : 'New to Plan Pilot? '}
            <Text style={{ color: Colors.brand[500], fontWeight: '700' }}>
              {isSignUp ? 'Sign in' : 'Create account'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
  },
  form: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
