import os
import re

filepath = "apps/mobile/app/(tabs)/settings.tsx"
with open(filepath, "r") as f:
    content = f.read()

# 1. Add import for useGlobalStore
if "import { useGlobalStore } from '@/store/globalStore';" not in content:
    content = content.replace(
        "import { Colors, type AccentId } from '@/constants/Colors';",
        "import { Colors, type AccentId } from '@/constants/Colors';\nimport { useGlobalStore } from '@/store/globalStore';"
    )

# 2. Replace local state with global store
old_state = """  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);"""

new_state = """  const { profile, notificationPrefs, fetchProfile, updateEnergyPreference, toggleNotifications, loading: storeLoading } = useGlobalStore();
  const notificationsEnabled = notificationPrefs?.master_toggle ?? true;"""

content = content.replace(old_state, new_state)

# 3. Replace fetchProfile and useEffect
old_fetch = """  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('users')
      .select('*, notification_preferences(*)')
      .eq('id', user.id)
      .single();
    setProfile(data);
    if (data?.notification_preferences) {
      setNotificationsEnabled(data.notification_preferences.master_toggle && data.notification_preferences.channels?.push !== false);
    } else {
      setNotificationsEnabled(data?.push_notifications_enabled !== false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);"""

new_fetch = """  useEffect(() => {
    if (user && !profile) {
      fetchProfile(user.id);
    }
  }, [user, profile, fetchProfile]);"""

content = content.replace(old_fetch, new_fetch)

# 4. Replace toggleNotifications and if(loading)
old_toggle = """  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (!user) return;

    try {
      const { data: existing } = await (supabase as any)
        .from('notification_preferences')
        .select('channels, master_toggle')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await (supabase as any)
          .from('notification_preferences')
          .update({
             master_toggle: value ? true : existing.master_toggle,
             channels: { ...(existing.channels || {}), push: value },
             updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        await (supabase as any)
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            master_toggle: value,
            channels: { push: value, email: true },
            quiet_hours: {
              enabled: false,
              start: '22:00',
              end: '08:00',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            },
            types: {
              daily_plan: true,
              deadline_rescue: true,
              weekly_review: true,
              account: true,
              billing: true,
              system: true,
            }
          });
      }

      if (value) {
        const { registerForPushNotifications } = await import('@/lib/notifications');
        const token = await registerForPushNotifications(user.id);
        if (!token) {
          const { disablePushNotifications } = await import('@/lib/notifications');
          await disablePushNotifications(user.id);
          setNotificationsEnabled(false);
        }
      } else {
        const { disablePushNotifications } = await import('@/lib/notifications');
        await disablePushNotifications(user.id);
      }
    } catch (err) {
      console.warn('Failed to update notifications:', err);
    }
  };

  if (loading) {"""

new_toggle = """  const handleToggleNotifications = async (value: boolean) => {
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

  if (storeLoading && !profile) {"""

content = content.replace(old_toggle, new_toggle)

# 5. Connect energy preference to onPress and toggleNotifications to handleToggleNotifications
old_energy_view = """          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Zap size={18} color={Colors.brand[500]} strokeWidth={2.5} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Energy Preference</Text>"""

new_energy_view = """          <TouchableOpacity style={styles.row} onPress={handleChangeEnergy}>
            <View style={styles.rowLeft}>
              <Zap size={18} color={Colors.brand[500]} strokeWidth={2.5} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Energy Preference</Text>"""

content = content.replace(old_energy_view, new_energy_view)

old_energy_end = """            <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.5} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />"""

new_energy_end = """            <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />"""

content = content.replace(old_energy_end, new_energy_end)

content = content.replace("onValueChange={toggleNotifications}", "onValueChange={handleToggleNotifications}")

with open(filepath, "w") as f:
    f.write(content)

print("Patched successfully")
