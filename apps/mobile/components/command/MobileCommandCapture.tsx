import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Mic, ArrowUp } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';

/**
 * Mobile capture — a prominent notepad-style input + a mic affordance. Fast dump
 * is the priority (§9.6). Not a chat bubble (§26.1). Voice is a graceful stub
 * until on-device recording lands (see COMMAND-INTEGRATION note).
 */
// COMMAND-INTEGRATION: real voice → POST /api/command/voice as multipart audio,
// gated on FEATURES.COMMAND_VOICE. Requires an audio recorder dependency
// (expo-av / expo-audio) that is not yet wired here; the mic currently nudges the
// user to type. Wire the recorder + reuse the same onPreview flow as text.
export function MobileCommandCapture({
  submitting,
  onSubmit,
  onVoiceUnavailable,
}: {
  submitting: boolean;
  onSubmit: (text: string) => void;
  onVoiceUnavailable?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Type, paste, or say everything you have going on."
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text }]}
      />
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityLabel="Capture by voice"
          onPress={onVoiceUnavailable}
          style={styles.mic}
        >
          <Mic size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Clear my plate"
          onPress={submit}
          disabled={submitting || text.trim().length === 0}
          style={[
            styles.submit,
            {
              backgroundColor: isDark ? Colors.brand[400] : Colors.brand[500],
              opacity: submitting || text.trim().length === 0 ? 0.4 : 1,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.submitText}>Clear My Plate</Text>
              <ArrowUp size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  input: { fontSize: 16, minHeight: 64, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mic: { height: 36, width: 36, alignItems: 'center', justifyContent: 'center' },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
