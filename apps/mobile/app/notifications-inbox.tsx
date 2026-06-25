import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckSquare,
  GraduationCap,
  Hash,
  MessageSquare,
  FileText,
  Sparkles,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

interface DeliveryRow {
  id: string;
  notification_type: string;
  sent_at: string;
  metadata: Record<string, unknown> | null;
}

function iconForType(type: string) {
  if (type.includes('canvas')) return GraduationCap;
  if (type.includes('calendar')) return CalendarDays;
  if (type.includes('slack')) return MessageSquare;
  if (type.includes('linear')) return Hash;
  if (type.includes('notion')) return FileText;
  if (type.includes('daily') || type.includes('plan')) return Sparkles;
  if (type.includes('deadline') || type.includes('upcoming')) return CheckSquare;
  return Bell;
}

function labelForType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function screenForDelivery(row: DeliveryRow): { pathname: string; params?: Record<string, string> } {
  const meta = row.metadata ?? {};
  const screen = typeof meta.screen === 'string' ? meta.screen : null;

  if (screen === 'chat' && typeof meta.prompt === 'string') {
    return { pathname: '/(tabs)/chat', params: { prompt: meta.prompt } };
  }
  if (screen === 'calendar' || row.notification_type.includes('calendar')) {
    return { pathname: '/(tabs)/calendar' };
  }
  if (screen === 'tasks' || row.notification_type.includes('deadline') || row.notification_type.includes('daily')) {
    return { pathname: '/(tabs)/tasks' };
  }
  if (screen === 'chat') {
    return { pathname: '/(tabs)/chat' };
  }
  return { pathname: '/(tabs)' };
}

export default function NotificationsInboxScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notification_deliveries')
      .select('id, notification_type, sent_at, metadata')
      .eq('user_id', user.id)
      .eq('channel', 'push')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setRows(data as DeliveryRow[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: DeliveryRow }) => {
    const Icon = iconForType(item.notification_type);
    const destination = screenForDelivery(item);

    return (
      <TouchableOpacity
        style={[styles.row, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
        onPress={() => router.push(destination as never)}
      >
        <View style={[styles.iconWrap, { backgroundColor: Colors.brand[50] }]}>
          <Icon size={18} color={Colors.brand[600]} strokeWidth={2.5} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            {labelForType(item.notification_type)}
          </Text>
          <Text style={[styles.rowTime, { color: colors.textMuted }]}>
            {formatWhen(item.sent_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notification inbox</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.brand[500]} />
          </View>
        ) : rows.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: Colors.brand[50], borderColor: Colors.brand[200] }]}>
            <Text style={styles.emptyEmoji}>🐻</Text>
            <Text style={[styles.emptyTitle, { color: Colors.brand[800] }]}>All quiet for now</Text>
            <Text style={[styles.emptyBody, { color: Colors.brand[700] }]}>
              When Bruno sends you a push, it&apos;ll show up here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowTime: { fontSize: 11, fontWeight: '500' },
  empty: {
    marginHorizontal: 20,
    marginTop: 24,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyBody: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
});
