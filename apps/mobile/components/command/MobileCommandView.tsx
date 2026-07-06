import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/providers/AuthProvider';
import {
  createCommandApi,
  CommandLimitError,
  type MobileBoard,
  type MobileResponsibilityItem,
} from '@/lib/commandApi';
import { MobileCommandCapture } from './MobileCommandCapture';
import { MobileCommandBoard } from './MobileCommandBoard';
import { MobileCommandPreviewSheet, type PreviewDraft } from './MobileCommandPreviewSheet';

const EMPTY_BOARD: MobileBoard = {
  now: [],
  today: [],
  dueSoon: [],
  onMyPlate: [],
  unsorted: [],
  waiting: [],
  done: [],
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Mobile Command — fast dump + preview confirm + a simple board (§9.6, §25). */
export function MobileCommandView() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const api = useMemo(() => (token ? createCommandApi(token) : null), [token]);

  const [board, setBoard] = useState<MobileBoard>(EMPTY_BOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [intakeRunId, setIntakeRunId] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [drafts, setDrafts] = useState<PreviewDraft[] | null>(null);

  const loadBoard = useCallback(async () => {
    if (!api) return;
    try {
      const next = await api.loadBoard();
      setBoard(next);
    } catch {
      // Keep last-known board; the pull-to-refresh + capture still work.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const itemCount = useMemo(
    () => Object.values(board).reduce((sum, list) => sum + list.length, 0),
    [board],
  );

  async function handleIntake(text: string) {
    if (!api) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await api.intake(text);
      setIntakeRunId(result.intakeRunId);
      setSummary(result.summary);
      setDrafts(result.previewItems.map((i) => ({ ...i, accepted: true })));
    } catch (err) {
      setNotice(
        err instanceof CommandLimitError
          ? err.message
          : 'Planevo could not read that. Try again, or add it manually.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDrafts() {
    if (!api || !intakeRunId || !drafts) return;
    setSubmitting(true);
    try {
      const next = await api.confirm(intakeRunId, drafts);
      setBoard(next);
      discard();
    } catch {
      setNotice('Could not save those. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function discard() {
    setDrafts(null);
    setIntakeRunId(null);
    setSummary('');
  }

  async function toggleDone(item: MobileResponsibilityItem) {
    if (!api) return;
    const next = item.status === 'done' ? 'active' : 'done';
    try {
      await api.setStatus(item.id, next);
      await loadBoard();
    } catch {
      /* keep board as-is on failure */
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadBoard();
            }}
            tintColor={colors.textMuted}
          />
        }
      >
        <Text style={[styles.greeting, { color: colors.text }]}>{greeting()}</Text>

        <View style={styles.capture}>
          <MobileCommandCapture
            submitting={submitting}
            onSubmit={handleIntake}
            onVoiceUnavailable={() =>
              setNotice('Voice capture is coming to mobile soon — type it for now.')
            }
          />
        </View>

        {notice ? (
          <Text style={[styles.notice, { color: colors.textSecondary }]}>{notice}</Text>
        ) : null}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.textMuted} />
        ) : itemCount === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            Start with the messy version. Planevo will sort it.
          </Text>
        ) : (
          <MobileCommandBoard board={board} onToggleDone={toggleDone} />
        )}
      </ScrollView>

      <MobileCommandPreviewSheet
        visible={drafts !== null}
        summary={summary}
        drafts={drafts ?? []}
        submitting={submitting}
        onToggle={(index) =>
          setDrafts((prev) =>
            prev ? prev.map((d, i) => (i === index ? { ...d, accepted: !d.accepted } : d)) : prev,
          )
        }
        onConfirm={confirmDrafts}
        onDiscard={discard}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  greeting: { fontSize: 30, fontWeight: '700', marginBottom: 16 },
  capture: { marginBottom: 8 },
  notice: { fontSize: 13, marginTop: 12 },
  empty: { fontSize: 15, textAlign: 'center', marginTop: 40, paddingHorizontal: 24, lineHeight: 22 },
});
