import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { GraduationCap } from 'lucide-react-native';

export default function CanvasConnectScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!url || !token) {
      Alert.alert('Missing Fields', 'Please enter both your Canvas URL and Token.');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          canvas_url: url.trim(),
          canvas_token: token.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      Alert.alert('Success', 'Canvas integration saved successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to save Canvas integration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <View style={[styles.iconWrapper, { backgroundColor: Colors.brand[100] }]}>
          <GraduationCap size={32} color={Colors.brand[600]} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Connect Canvas LMS</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Enter your Canvas URL and API token to sync your assignments automatically.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Canvas URL</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.cardBorder }]}
            placeholder="e.g., canvas.instructure.com"
            placeholderTextColor={colors.textMuted}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Access Token</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.cardBorder }]}
            placeholder="Your Canvas API Token"
            placeholderTextColor={colors.textMuted}
            value={token}
            onChangeText={setToken}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: Colors.brand[500] }, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Integration</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  form: { gap: 20, flex: 1 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  footer: { paddingBottom: 24 },
  button: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
