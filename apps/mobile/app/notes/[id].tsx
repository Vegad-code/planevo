import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { blocksToMarkdown, markdownToPlainParagraphBlocks } from '@planevo/notes-core';
import { useTheme } from '@/hooks/useTheme';
import { Colors, NOTE_ACCENTS } from '@/constants/Colors';
import { fetchNote, updateNote } from '@/lib/notes/api';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    void fetchNote(id)
      .then((note) => {
        setTitle(note.title);
        setBody(note.content_markdown ?? note.content ?? '');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const persist = useCallback(async (nextTitle: string, nextBody: string) => {
    if (!id || !dirtyRef.current) return;
    setSaveState('saving');
    try {
      const contentJson = markdownToPlainParagraphBlocks(nextBody);
      await updateNote(id, {
        title: nextTitle,
        content: blocksToMarkdown(contentJson),
        contentJson,
      });
      dirtyRef.current = false;
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1200);
    } catch {
      setSaveState('idle');
    }
  }, [id]);

  const scheduleSave = (nextTitle: string, nextBody: string) => {
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(nextTitle, nextBody), 1500);
  };

  const savePillStyle =
    saveState === 'saved'
      ? { backgroundColor: Colors.success, color: '#fff' }
      : saveState === 'saving'
        ? { backgroundColor: Colors.brand[400], color: '#fff' }
        : { backgroundColor: isDark ? colors.card : NOTE_ACCENTS.cream, color: colors.textMuted };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.brand[500]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={[styles.savePill, { backgroundColor: savePillStyle.backgroundColor }]}>
            <Text style={[styles.saveHint, { color: savePillStyle.color }]}>
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Auto-save'}
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <TextInput
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              scheduleSave(value, body);
            }}
            placeholder="Untitled"
            placeholderTextColor={colors.textMuted}
            style={[styles.titleInput, { color: colors.text }]}
          />

          <TextInput
            value={body}
            onChangeText={(value) => {
              setBody(value);
              scheduleSave(title, value);
            }}
            placeholder="Start writing…"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            style={[
              styles.bodyInput,
              {
                color: colors.text,
                backgroundColor: isDark ? colors.card : NOTE_ACCENTS.cream,
              },
            ]}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { padding: 8 },
  savePill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveHint: { fontSize: 12, fontWeight: '600' },
  scrollContent: { paddingBottom: 32 },
  titleInput: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  bodyInput: {
    minHeight: 360,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    fontSize: 16,
    lineHeight: 26,
  },
});
