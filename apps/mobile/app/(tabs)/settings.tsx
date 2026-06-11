import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { CustomerInfo } from 'react-native-purchases';
import { useTheme } from '@/hooks/useTheme';
import { Colors, type AccentId } from '@/constants/Colors';
import { useGlobalStore } from '@/store/globalStore';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  addCustomerInfoListener,
  getCustomerInfo,
  isPro,
  presentCustomerCenter,
  presentPlanevoProPaywallIfNeeded,
} from '@/lib/revenuecat';
import {
  LogOut,
  User,
  GraduationCap,
  CalendarDays,
  ChevronRight,
  Zap,
  Shield,
  Bell,
  Check,
} from 'lucide-react-native';

const THEME_MODES: { id: 'system' | 'light' | 'dark'; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, setMode, accentId, setAccent, accents } = useTheme();
  const { user, signOut } = useAuth();
  const { profile, notificationPrefs, fetchProfile, updateEnergyPreference, toggleNotifications, loading: storeLoading } = useGlobalStore();
  const notificationsEnabled = notificationPrefs?.master_toggle ?? true;
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const isPlanevoPro = isPro(customerInfo);

  useEffect(() => {
    if (user && !profile) {
      fetchProfile(user.id);
    }
  }, [user, profile, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    let removeListener: (() => void) | undefined;

    const loadSubscription = async () => {
      const info = await getCustomerInfo();
      if (mounted) {
        setCustomerInfo(info);
      }

      removeListener = addCustomerInfoListener((updatedInfo) => {
        if (mounted) {
          setCustomerInfo(updatedInfo);
        }
      });
    };

    loadSubscription();

    return () => {
      mounted = false;
      removeListener?.();
    };
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  const refreshSubscription = async () => {
    const info = await getCustomerInfo();
    setCustomerInfo(info);
    return info;
  };

  const handleOpenCustomerCenter = async () => {
    setSubscriptionLoading(true);

    try {
      await presentCustomerCenter();
      await refreshSubscription();
    } catch (err: any) {
      Alert.alert(
        'Subscription Unavailable',
        err?.message ?? 'Customer Center could not be opened right now.'
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleOpenPaywall = async () => {
    setSubscriptionLoading(true);

    try {
      await presentPlanevoProPaywallIfNeeded();
      await refreshSubscription();
    } catch (err: any) {
      Alert.alert(
        'Plans Unavailable',
        err?.message ?? 'Planevo Pro plans could not be loaded right now.'
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    await toggleNotifications(value);
  };

  const handleChangeEnergy = () => {
    Alert.alert(
      "Energy Preference",
      "How do you prefer to tackle tasks?",
      [
        { text: "Low (Easy tasks first)", onPress: () => updateEnergyPreference("low") },
        { text: "Medium (Balanced)", onPress: () => updateEnergyPreference("medium") },
        { text: "High (Hardest tasks first)", onPress: () => updateEnergyPreference("high") },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  if (storeLoading && !profile) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.brand[500]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Settings</Text>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} testID="settings-profile">
          <View style={[styles.avatar, { backgroundColor: Colors.brand[100] }]}>
            <User size={28} color={Colors.brand[600]} strokeWidth={2} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {profile?.name || 'Planevo User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>
              {user?.email}
            </Text>
            <View style={[styles.planBadge, { backgroundColor: Colors.brand[50], borderColor: Colors.brand[300] }]}>
              <Zap size={10} color={Colors.brand[600]} strokeWidth={2.5} fill={Colors.brand[600]} />
              <Text style={[styles.planBadgeText, { color: Colors.brand[600] }]}>
                {(isPlanevoPro ? 'Planevo Pro' : profile?.plan_type || 'trial').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Connections Section */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CONNECTIONS</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <SettingsRow
            icon={<GraduationCap size={18} color={Colors.brand[500]} strokeWidth={2.5} />}
            label="Canvas LMS"
            detail={profile?.canvas_token ? 'Connected' : 'Not connected'}
            connected={!!profile?.canvas_token}
            colors={colors}
            testID="settings-canvas"
            onPress={() => router.push('/canvas-connect' as any)}
          />
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <SettingsRow
            icon={<CalendarDays size={18} color={Colors.brand[500]} strokeWidth={2.5} />}
            label="Google Calendar"
            detail={profile?.google_calendar_connected ? 'Synced' : 'Not connected'}
            connected={!!profile?.google_calendar_connected}
            colors={colors}
            testID="settings-calendar"
          />
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PREFERENCES</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TouchableOpacity style={styles.row} onPress={handleChangeEnergy}>
            <View style={styles.rowLeft}>
              <Zap size={18} color={Colors.brand[500]} strokeWidth={2.5} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Energy Preference</Text>
                <Text style={[styles.rowDetail, { color: colors.textMuted }]}>
                  {(profile?.energy_preference || 'Medium').charAt(0).toUpperCase() + (profile?.energy_preference || 'medium').slice(1)}
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Bell size={18} color={colors.tint} strokeWidth={2.5} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.separator, true: colors.tint }}
              thumbColor={'#ffffff'}
              testID="settings-notifications-toggle"
            />
          </View>
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.appearanceBlock}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Theme</Text>
            <View style={[styles.segment, { borderColor: colors.cardBorder }]}>
              {THEME_MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    testID={`settings-theme-${m.id}`}
                    onPress={() => setMode(m.id)}
                    style={[
                      styles.segmentItem,
                      active && { backgroundColor: colors.tint },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: active ? '#ffffff' : colors.textMuted },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <View style={styles.appearanceBlock}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Accent color</Text>
            <View style={styles.swatchRow}>
              {accents.map((a) => {
                const active = accentId === (a.id as AccentId);
                return (
                  <TouchableOpacity
                    key={a.id}
                    testID={`settings-accent-${a.id}`}
                    onPress={() => setAccent(a.id as AccentId)}
                    style={[
                      styles.swatch,
                      { backgroundColor: a.primary },
                      active && styles.swatchActive,
                    ]}
                  >
                    {active && <Check size={16} color="#ffffff" strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Subscription Section */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SUBSCRIPTION</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <SettingsRow
            icon={<Zap size={18} color={Colors.brand[500]} strokeWidth={2.5} />}
            label="Manage Subscription"
            detail={subscriptionLoading ? 'Loading...' : 'Open Customer Center'}
            connected={isPlanevoPro}
            colors={colors}
            testID="settings-subscription-manage"
            onPress={handleOpenCustomerCenter}
          />
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <SettingsRow
            icon={<Zap size={18} color={Colors.brand[500]} strokeWidth={2.5} />}
            label="Planevo Pro"
            detail={isPlanevoPro ? 'Active' : 'View Plans'}
            connected={isPlanevoPro}
            colors={colors}
            testID="settings-subscription-paywall"
            onPress={handleOpenPaywall}
          />
        </View>

        {/* Account Section */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCOUNT</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Shield size={18} color={Colors.brand[500]} strokeWidth={2.5} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>Privacy & Security</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.5} />
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutButton, { borderColor: Colors.error }]}
          onPress={handleSignOut}
          testID="settings-sign-out"
        >
          <LogOut size={18} color={Colors.error} strokeWidth={2.5} />
          <Text style={[styles.signOutText, { color: Colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Planevo Mobile v1.0.0
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  detail,
  connected,
  colors,
  testID,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  connected: boolean;
  colors: any;
  testID: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} testID={testID} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowLeft}>
        {icon}
        <View>
          <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.rowDetail, { color: connected ? Colors.brand[500] : colors.textMuted }]}>
            {detail}
          </Text>
        </View>
      </View>
      <View style={[styles.statusDot, { backgroundColor: connected ? Colors.brand[500] : colors.separator }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, gap: 6 },
  screenTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1.2, marginBottom: 20 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 18,
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 17, fontWeight: '800' },
  profileEmail: { fontSize: 12, fontWeight: '500' },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  planBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderWidth: 1.5,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '700' },
  rowDetail: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  divider: { height: 1, marginHorizontal: 16 },
  appearanceBlock: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentText: { fontSize: 13, fontWeight: '800' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
    transform: [{ scale: 1.06 }],
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 24,
  },
  signOutText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  versionText: { textAlign: 'center', fontSize: 11, fontWeight: '500', marginTop: 16 },
});
