import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { getNoteAccentHex } from '@planevo/notes-core';
import { useTheme } from '@/hooks/useTheme';
import { Colors, NOTE_ACCENTS } from '@/constants/Colors';
import { fetchDueFlashcards, reviewFlashcard } from '@/lib/notes/api';

type Flashcard = { id: string; front: string; back: string; note_id?: string };

export default function MobileFlashcardsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDueFlashcards();
      setCards(data);
      setIndex(0);
      setRevealed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = cards[index];
  const accent = current?.note_id
    ? getNoteAccentHex(current.note_id, { noteKind: 'study_guide' })
    : NOTE_ACCENTS.cream;

  const handleReview = async (quality: number) => {
    if (!current) return;
    await reviewFlashcard(current.id, quality);
    setRevealed(false);
    if (index + 1 >= cards.length) {
      void load();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Flashcards</Text>
        <View style={{ width: 20 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.brand[500]} />
      ) : !current ? (
        <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.card : NOTE_ACCENTS.cream }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up</Text>
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No cards due right now.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {index + 1} / {cards.length}
          </Text>
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.card : accent,
                borderColor: isDark ? colors.border : 'transparent',
              },
            ]}
            onPress={() => setRevealed((v) => !v)}
            activeOpacity={0.9}
          >
            <Text style={[styles.front, { color: colors.text }]}>{current.front}</Text>
            {revealed && (
              <Text style={[styles.back, { color: colors.textMuted }]}>{current.back}</Text>
            )}
            {!revealed && (
              <Text style={[styles.tapHint, { color: colors.textMuted }]}>Tap to reveal</Text>
            )}
          </TouchableOpacity>
          {revealed && (
            <View style={styles.actions}>
              {(
                [
                  { label: 'Again', quality: 1, primary: false },
                  { label: 'Hard', quality: 3, primary: false },
                  { label: 'Good', quality: 4, primary: true },
                  { label: 'Easy', quality: 5, primary: false },
                ] as const
              ).map(({ label, quality, primary }) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.actionBtn,
                    primary
                      ? { backgroundColor: Colors.brand[400], borderColor: Colors.brand[400] }
                      : { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                  onPress={() => void handleReview(quality)}
                >
                  <Text
                    style={{
                      color: primary ? '#fff' : colors.text,
                      fontSize: 13,
                      fontWeight: primary ? '700' : '500',
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  emptyCard: {
    margin: 20,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  empty: { textAlign: 'center', fontSize: 14 },
  content: { flex: 1, padding: 20, gap: 12 },
  meta: { fontSize: 12 },
  card: {
    minHeight: 200,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
  },
  front: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  back: { marginTop: 20, fontSize: 16, lineHeight: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(26,20,13,0.12)' },
  tapHint: { marginTop: 20, fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexGrow: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
