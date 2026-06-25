import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Search, StickyNote, Cards } from 'lucide-react-native';
import { getNoteAccentHex, stripMarkdownPreview } from '@planevo/notes-core';
import { useTheme } from '@/hooks/useTheme';
import { Colors, NOTE_ACCENTS } from '@/constants/Colors';
import { createQuickNote, fetchNotes, syncNotebooks, type MobileNoteListItem } from '@/lib/notes/api';

const GRID_GAP = 12;
const H_PADDING = 20;

export default function NotesScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = (width - H_PADDING * 2 - GRID_GAP) / 2;
  const [notes, setNotes] = useState<MobileNoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      await syncNotebooks();
      const data = await fetchNotes(search.trim() || undefined);
      setNotes(data);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleQuickCapture = async () => {
    try {
      const note = await createQuickNote();
      router.push(`/notes/${note.id}`);
    } catch {
      // noop
    }
  };

  const renderNote = ({ item }: { item: MobileNoteListItem }) => {
    const accent = getNoteAccentHex(item.id, {
      noteKind: item.note_kind,
      isPinned: item.is_pinned,
      isDaily: item.note_kind === 'daily',
    });
    const preview = stripMarkdownPreview(item.content_markdown);

    return (
      <TouchableOpacity
        style={[
          styles.noteCard,
          {
            width: cardWidth,
            backgroundColor: isDark ? Colors.surface[800] : accent,
            borderColor: isDark ? colors.border : 'transparent',
          },
        ]}
        onPress={() => router.push(`/notes/${item.id}`)}
        activeOpacity={0.85}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>
        {item.canvas_course_name ? (
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.canvas_course_name}
          </Text>
        ) : null}
        <Text style={[styles.cardPreview, { color: colors.textMuted }]} numberOfLines={3}>
          {preview || 'Empty note'}
        </Text>
        <Text style={[styles.cardDate, { color: colors.textMuted }]}>
          {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Notes</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your study space</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/notes/flashcards')}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Cards size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => void handleQuickCapture()}
            style={[styles.captureBtn, { backgroundColor: Colors.surface[900] }]}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.searchRow,
          {
            backgroundColor: isDark ? colors.card : NOTE_ACCENTS.cream,
            borderColor: colors.border,
          },
        ]}
      >
        <Search size={16} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="search"
          onSubmitEditing={() => void load()}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.brand[500]} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyStack, { backgroundColor: NOTE_ACCENTS.sky }]}>
                <View style={[styles.emptyStackMid, { backgroundColor: NOTE_ACCENTS.yellow }]} />
                <View style={[styles.emptyStackFront, { backgroundColor: NOTE_ACCENTS.cream }]}>
                  <StickyNote size={28} color={colors.textMuted} />
                </View>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Capture a thought</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Tap + for a quick note or ask Bruno for study guides.
              </Text>
            </View>
          }
          renderItem={renderNote}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: H_PADDING,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#1A140D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15 },
  listContent: { paddingHorizontal: H_PADDING, paddingBottom: 32 },
  row: { gap: GRID_GAP, marginBottom: GRID_GAP },
  noteCard: {
    minHeight: 150,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardMeta: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  cardPreview: { fontSize: 12, marginTop: 8, lineHeight: 17, flex: 1 },
  cardDate: { fontSize: 10, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 12 },
  emptyStack: {
    width: 100,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStackMid: {
    position: 'absolute',
    width: 88,
    height: 72,
    borderRadius: 14,
    top: 8,
    transform: [{ rotate: '4deg' }],
  },
  emptyStackFront: {
    width: 88,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyText: { textAlign: 'center', lineHeight: 20, fontSize: 14 },
});
