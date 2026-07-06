import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import type { MobilePreviewItem } from '@/lib/commandApi';
import { formatDue } from './MobileCommandItemRow';

export interface PreviewDraft extends MobilePreviewItem {
  accepted: boolean;
}

/**
 * Bottom-sheet-style preview (slide-up Modal). Shows extracted items with accept
 * toggles + "Add to Command" (§38). Kept simple and dependency-light so it works
 * without a bottom-sheet provider.
 */
export function MobileCommandPreviewSheet({
  visible,
  summary,
  drafts,
  submitting,
  onToggle,
  onConfirm,
  onDiscard,
}: {
  visible: boolean;
  summary: string;
  drafts: PreviewDraft[];
  submitting: boolean;
  onToggle: (index: number) => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const { colors, isDark } = useTheme();
  const acceptedCount = drafts.filter((d) => d.accepted).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDiscard}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>Review what Planevo found</Text>
          {summary ? (
            <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}

          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 8 }}>
            {drafts.map((draft, index) => {
              const due = formatDue(draft.dueAt);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.item, { borderBottomColor: colors.separator }]}
                  onPress={() => onToggle(index)}
                >
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: draft.accepted
                          ? (isDark ? Colors.brand[400] : Colors.brand[500])
                          : colors.textMuted,
                        backgroundColor: draft.accepted
                          ? (isDark ? Colors.brand[400] : Colors.brand[500])
                          : 'transparent',
                      },
                    ]}
                  >
                    {draft.accepted ? <Check size={12} color="#fff" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: draft.accepted ? colors.text : colors.textMuted },
                        !draft.accepted && styles.itemTitleOff,
                      ]}
                    >
                      {draft.title}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      {[due, draft.needsReview ? (draft.reviewReason ?? 'Needs a date') : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onDiscard}>
              <Text style={[styles.discard, { color: colors.textMuted }]}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={submitting || acceptedCount === 0}
              style={[
                styles.confirm,
                {
                  backgroundColor: isDark ? Colors.brand[400] : Colors.brand[500],
                  opacity: submitting || acceptedCount === 0 ? 0.4 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>
                  Add to Command{acceptedCount > 0 ? ` (${acceptedCount})` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    maxHeight: '82%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '700' },
  summary: { fontSize: 13, marginTop: 4 },
  list: { marginTop: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  check: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  itemTitle: { fontSize: 15, fontWeight: '500' },
  itemTitleOff: { textDecorationLine: 'line-through' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  discard: { fontSize: 14 },
  confirm: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999 },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
