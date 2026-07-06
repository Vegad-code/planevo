import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { MobileBoard, MobileResponsibilityItem } from '@/lib/commandApi';
import { MobileCommandItemRow } from './MobileCommandItemRow';

const SECTIONS: { key: keyof MobileBoard; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: 'today', label: 'Today' },
  { key: 'dueSoon', label: 'Due soon' },
  { key: 'onMyPlate', label: 'On my plate' },
  { key: 'unsorted', label: 'Needs review' },
];

/** A simple sectioned list — fast to scan, no kanban (§10 / §26 mobile). */
export function MobileCommandBoard({
  board,
  onToggleDone,
}: {
  board: MobileBoard;
  onToggleDone: (item: MobileResponsibilityItem) => void;
}) {
  const { colors } = useTheme();

  return (
    <View>
      {SECTIONS.map(({ key, label }) => {
        const items = board[key];
        if (!items || items.length === 0) return null;
        return (
          <View key={key} style={styles.section}>
            <View style={styles.header}>
              <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
                {label.toUpperCase()}
              </Text>
              <Text style={[styles.headerCount, { color: colors.textMuted }]}>{items.length}</Text>
            </View>
            {items.map((item) => (
              <MobileCommandItemRow key={item.id} item={item} onToggleDone={onToggleDone} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  headerLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  headerCount: { fontSize: 12, fontVariant: ['tabular-nums'] },
});
