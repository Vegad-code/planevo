import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import type { CustomerInfo } from 'react-native-purchases';
import {
  ArrowLeft,
  Bell,
  BellRing,
  CalendarDays,
  GraduationCap,
  Moon,
  Send,
  Sparkles,
  MessageSquare,
  Hash,
  FileText,
  ChevronRight,
  Inbox,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { useGlobalStore, type NotificationTypePrefs } from '@/store/globalStore';
import { openNotificationSettings } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { addCustomerInfoListener, getCustomerInfo, isPro } from '@/lib/revenuecat';

function permissionLabel(state: string) {
  if (state === 'granted') return 'Allowed';
  if (state === 'denied') return 'Blocked in system settings';
  return 'Not requested yet';
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    profile,
    notificationPrefs,
    permissionState,
    fetchProfile,
    refreshPermissionState,
    setMasterNotifications,
    updateNotificationPreferences,
    toggleNotificationType,
    loading,
  } = useGlobalStore();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [lastPushAt, setLastPushAt] = useState<string | null>(null);
  const [pushesToday, setPushesToday] = useState(0);

  const isPlanevoPro = isPro(customerInfo);
  const prefs = notificationPrefs;
  const masterOn = prefs?.master_toggle ?? true;

  const loadDeliveryInsight = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notification_deliveries')
      .select('sent_at')
      .eq('user_id', user.id)
      .eq('channel', 'push')
      .order('sent_at', { ascending: false })
      .limit(1);

    if (data?.[0]?.sent_at) {
      setLastPushAt(data[0].sent_at);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('notification_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('channel', 'push')
      .gte('sent_at', startOfDay.toISOString());

    setPushesToday(count ?? 0);
  }, [user]);

  useEffect(() => {
    if (user && !profile) {
      fetchProfile(user.id);
    }
  }, [user, profile, fetchProfile]);

  useEffect(() => {
    refreshPermissionState();
    loadDeliveryInsight();
  }, [refreshPermissionState, loadDeliveryInsight]);

  useEffect(() => {
    let mounted = true;
    getCustomerInfo().then((info) => {
      if (mounted) setCustomerInfo(info);
    });
    const remove = addCustomerInfoListener((info) => {
      if (mounted) setCustomerInfo(info);
    });
    return () => {
      mounted = false;
      remove?.();
    };
  }, []);

  const handleMasterToggle = async (value: boolean) => {
    const result = await setMasterNotifications(value);
    if (result.permissionDenied) {
      Alert.alert(
        'Notifications blocked',
        'Planevo needs permission to send push alerts. Open system settings to allow notifications.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openNotificationSettings() },
        ]
      );
    }
    await refreshPermissionState();
  };

  const handleTestPush = async () => {
    if (!user) return;
    setTestLoading(true);
    setTestMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Session expired. Please sign in again.');

      let apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) {
        if (__DEV__) apiUrl = 'http://localhost:3000';
        else throw new Error('EXPO_PUBLIC_API_URL is required in production builds.');
      }

      const res = await fetch(`${apiUrl}/api/notifications/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setTestMessage(data.error || 'Failed to send test notification');
      } else {
        setTestMessage(data.message || 'Test notification sent!');
        loadDeliveryInsight();
      }
    } catch (err) {
      setTestMessage(err instanceof Error ? err.message : 'Failed to send test');
    } finally {
      setTestLoading(false);
    }
  };

  const updateQuietHours = (field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    if (!prefs) return;
    updateNotificationPreferences({
      quiet_hours: {
        ...prefs.quiet_hours,
        [field]: value,
        timezone: prefs.quiet_hours.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
    });
  };

  const renderTypeRow = (
    key: keyof NotificationTypePrefs,
    title: string,
    description: string,
    icon: React.ReactNode,
    disabled = false
  ) => (
    <View key={key} style={[styles.typeRow, disabled && styles.typeRowDisabled]}>
      <View style={styles.typeRowLeft}>
        {icon}
        <View style={styles.typeCopy}>
          <Text style={[styles.typeTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.typeDescription, { color: colors.textMuted }]}>{description}</Text>
        </View>
      </View>
      <Switch
        value={prefs?.types[key] ?? false}
        onValueChange={(v) => toggleNotificationType(key, v)}
        disabled={disabled || !masterOn}
        trackColor={{ false: colors.separator, true: colors.tint }}
        thumbColor="#ffffff"
      />
    </View>
  );

  if (loading && !prefs) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.brand[500]} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} testID="notifications-back">
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Bruno status card */}
          <View style={[styles.brunoCard, { backgroundColor: Colors.brand[50], borderColor: Colors.brand[200] }]}>
            <Text style={styles.brunoEmoji}>🐻</Text>
            <View style={styles.brunoCopy}>
              <Text style={[styles.brunoTitle, { color: Colors.brand[800] }]}>Bruno says hi</Text>
              <Text style={[styles.brunoSubtitle, { color: Colors.brand[700] }]}>
                I&apos;ll tap your shoulder for what matters — never a firehose.
              </Text>
              <Text style={[styles.brunoMeta, { color: Colors.brand[600] }]}>
                Permission: {permissionLabel(permissionState)}
              </Text>
              <Text style={[styles.brunoMeta, { color: Colors.brand[600] }]}>
                Timezone: {prefs?.quiet_hours.timezone || 'UTC'}
              </Text>
              {lastPushAt && (
                <Text style={[styles.brunoMeta, { color: Colors.brand[600] }]}>
                  Last push: {formatRelativeTime(lastPushAt)}
                </Text>
              )}
            </View>
          </View>

          {permissionState === 'denied' && (
            <TouchableOpacity
              style={[styles.permissionBanner, { borderColor: Colors.error }]}
              onPress={() => openNotificationSettings()}
            >
              <Text style={[styles.permissionText, { color: Colors.error }]}>
                Notifications are blocked. Tap to open system settings.
              </Text>
            </TouchableOpacity>
          )}

          {/* Delivery */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DELIVERY</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.masterRow}>
              <View style={styles.typeRowLeft}>
                <Bell size={18} color={colors.tint} strokeWidth={2.5} />
                <View>
                  <Text style={[styles.typeTitle, { color: colors.text }]}>Push notifications</Text>
                  <Text style={[styles.typeDescription, { color: colors.textMuted }]}>
                    Master switch for alerts on this device
                  </Text>
                </View>
              </View>
              <Switch
                value={masterOn && (prefs?.channels.push ?? true)}
                onValueChange={handleMasterToggle}
                trackColor={{ false: colors.separator, true: colors.tint }}
                thumbColor="#ffffff"
                testID="notifications-master-toggle"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
            <TouchableOpacity
              style={styles.testRow}
              onPress={handleTestPush}
              disabled={testLoading || !masterOn}
              testID="notifications-test-push"
            >
              <Send size={18} color={Colors.brand[500]} strokeWidth={2.5} />
              <Text style={[styles.testLabel, { color: colors.text }]}>
                {testLoading ? 'Sending…' : 'Send test notification'}
              </Text>
            </TouchableOpacity>
            {testMessage && (
              <Text style={[styles.testMessage, { color: testMessage.includes('success') || testMessage.includes('sent') ? Colors.brand[600] : Colors.error }]}>
                {testMessage}
              </Text>
            )}
            <Text style={[styles.capHint, { color: colors.textMuted }]}>
              {pushesToday}/4 pushes used today (daily cap)
            </Text>
          </View>

          {masterOn && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>YOUR DAY</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {renderTypeRow('daily_plan', 'Daily plan', 'Morning nudge when your day is ready', <Sparkles size={18} color={Colors.brand[500]} />)}
                <View style={[styles.divider, { backgroundColor: colors.separator }]} />
                {renderTypeRow('deadline_rescue', 'Deadline rescue', 'Evening reminder for tasks due today', <BellRing size={18} color={Colors.brand[500]} />)}
                <View style={[styles.divider, { backgroundColor: colors.separator }]} />
                {renderTypeRow('upcoming_reminders', 'Upcoming reminders', 'Tasks due in the next few days', <CalendarDays size={18} color={Colors.brand[500]} />)}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SCHOOL & CALENDAR</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {renderTypeRow(
                  'canvas_assignments',
                  'Canvas assignments',
                  profile?.canvasConnected ? 'New assignments and due dates' : 'Connect Canvas in settings first',
                  <GraduationCap size={18} color={Colors.brand[500]} />,
                  !profile?.canvasConnected
                )}
                <View style={[styles.divider, { backgroundColor: colors.separator }]} />
                {renderTypeRow(
                  'calendar_events',
                  'Google Calendar',
                  profile?.googleConnected ? 'Events starting soon and daily digest' : 'Connect Google Calendar first',
                  <CalendarDays size={18} color={Colors.brand[500]} />,
                  !profile?.googleConnected
                )}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                WORK TOOLS {!isPlanevoPro ? '(PRO)' : ''}
              </Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {renderTypeRow(
                  'work_slack',
                  'Slack digest',
                  'Bundled updates from connected Slack',
                  <MessageSquare size={18} color={Colors.brand[500]} />,
                  !isPlanevoPro
                )}
                <View style={[styles.divider, { backgroundColor: colors.separator }]} />
                {renderTypeRow(
                  'work_linear',
                  'Linear digest',
                  'Issue assignments and status changes',
                  <Hash size={18} color={Colors.brand[500]} />,
                  !isPlanevoPro
                )}
                <View style={[styles.divider, { backgroundColor: colors.separator }]} />
                {renderTypeRow(
                  'work_notion',
                  'Notion digest',
                  'Page updates and due dates',
                  <FileText size={18} color={Colors.brand[500]} />,
                  !isPlanevoPro
                )}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>QUIET HOURS</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.typeRow}>
                  <View style={styles.typeRowLeft}>
                    <Moon size={18} color={Colors.brand[500]} strokeWidth={2.5} />
                    <View>
                      <Text style={[styles.typeTitle, { color: colors.text }]}>Enable quiet hours</Text>
                      <Text style={[styles.typeDescription, { color: colors.textMuted }]}>
                        Pause pushes during sleep
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={prefs?.quiet_hours.enabled ?? false}
                    onValueChange={(v) => updateQuietHours('enabled', v)}
                    trackColor={{ false: colors.separator, true: colors.tint }}
                    thumbColor="#ffffff"
                  />
                </View>
                {prefs?.quiet_hours.enabled && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.separator }]} />
                    <View style={styles.quietRow}>
                      <View style={styles.timeField}>
                        <Text style={[styles.timeLabel, { color: colors.textMuted }]}>From</Text>
                        <TextInput
                          style={[styles.timeInput, { color: colors.text, borderColor: colors.cardBorder }]}
                          value={prefs.quiet_hours.start}
                          onChangeText={(v) => updateQuietHours('start', v)}
                          placeholder="22:00"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                      <View style={styles.timeField}>
                        <Text style={[styles.timeLabel, { color: colors.textMuted }]}>To</Text>
                        <TextInput
                          style={[styles.timeInput, { color: colors.text, borderColor: colors.cardBorder }]}
                          value={prefs.quiet_hours.end}
                          onChangeText={(v) => updateQuietHours('end', v)}
                          placeholder="08:00"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    </View>
                  </>
                )}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>INBOX</Text>
              <TouchableOpacity
                style={[styles.card, styles.inboxRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push('/notifications-inbox')}
                testID="notifications-inbox-link"
              >
                <View style={styles.typeRowLeft}>
                  <Inbox size={18} color={Colors.brand[500]} strokeWidth={2.5} />
                  <View>
                    <Text style={[styles.typeTitle, { color: colors.text }]}>Notification history</Text>
                    <Text style={[styles.typeDescription, { color: colors.textMuted }]}>
                      See what Bruno sent recently
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 6 },
  brunoCard: {
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
  },
  brunoEmoji: { fontSize: 32 },
  brunoCopy: { flex: 1, gap: 4 },
  brunoTitle: { fontSize: 16, fontWeight: '800' },
  brunoSubtitle: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  brunoMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  permissionBanner: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  permissionText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { borderWidth: 1.5, borderRadius: 18, overflow: 'hidden' },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  typeRowDisabled: { opacity: 0.45 },
  typeRowLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  typeCopy: { flex: 1, gap: 2 },
  typeTitle: { fontSize: 14, fontWeight: '700' },
  typeDescription: { fontSize: 11, fontWeight: '500', lineHeight: 15 },
  divider: { height: 1, marginHorizontal: 16 },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  testLabel: { fontSize: 14, fontWeight: '700' },
  testMessage: { fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingBottom: 8 },
  capHint: { fontSize: 11, fontWeight: '500', paddingHorizontal: 16, paddingBottom: 12 },
  quietRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  timeField: { flex: 1, gap: 4 },
  timeLabel: { fontSize: 11, fontWeight: '700' },
  timeInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  inboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
