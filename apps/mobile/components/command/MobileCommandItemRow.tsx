import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import type { MobileResponsibilityItem } from '@/lib/commandApi';

/** Compact human due label (mirrors the web `formatDue`, kept minimal for mobile). */
export function formatDue(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  const now = new Date();
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(due) - day(now)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** One dense responsibility row — title + muted due, tap the circle to complete. */
export function MobileCommandItemRow({
  item,
  onToggleDone,
}: {
  item: MobileResponsibilityItem;
  onToggleDone: (item: MobileResponsibilityItem) => void;
}) {
  const { colors } = useTheme();
  const done = item.status === 'done';
  const due = formatDue(item.dueAt);
  const pastDue = item.dueAt ? new Date(item.dueAt).getTime() < Date.now() && !done : false;

  return (
    <View style={[styles.row, { borderBottomColor: colors.separator }]}>
      <TouchableOpacity
        accessibilityLabel={done ? 'Mark not done' : 'Mark done'}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleDone(item);
        }}
      >
        {done ? (
          <CheckCircle2 size={22} color={colors.tint} />
        ) : (
          <Circle size={22} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      <Text
        numberOfLines={1}
        style={[
          styles.title,
          { color: done ? colors.textMuted : colors.text },
          done && styles.titleDone,
        ]}
      >
        {item.title}
      </Text>

      {due ? (
        <Text style={[styles.due, { color: pastDue ? colors.tint : colors.textMuted }]}>
          {due}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 15, fontWeight: '500' },
  titleDone: { textDecorationLine: 'line-through' },
  due: { fontSize: 13, fontVariant: ['tabular-nums'] },
});
