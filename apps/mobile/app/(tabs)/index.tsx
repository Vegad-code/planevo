import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { writeWidgetData } from '@/lib/widgetData';
import { calculateMomentumStats, MomentumStats } from '@/lib/stats';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkState } from '@/hooks/useNetworkState';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
  Zap,
  Target,
  CheckCircle2,
  Clock,
  ChevronDown,
  Sparkles,
  GraduationCap,
  CalendarDays,
  ArrowRight,
} from 'lucide-react-native';

interface MiniTask {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  priority: string;
  energy_level_required: string | null;
}

interface ScheduleBlock {
  id?: string;
  title: string;
  startTime?: string;
  endTime?: string;
  suggested_start?: string;
  suggested_end?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  taskId?: string;
  type?: string;
}

interface ConnectionStatus {
  canvasConnected: boolean;
  canvasDueCount: number;
  googleConnected: boolean;
}

export default function DailyPlanScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isOffline } = useNetworkState();

  const [userName, setUserName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<MiniTask[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [connections, setConnections] = useState<ConnectionStatus>({
    canvasConnected: false,
    canvasDueCount: 0,
    googleConnected: false,
  });
  const [momentumStats, setMomentumStats] = useState<MomentumStats>({
    focusTimeMinutes: 0,
    tasksCrushed: 0,
    tasksPlanned: 0,
    upcomingDeadlines: 0,
    consistencyPercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFullPlan, setShowFullPlan] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');

  const timeOfDay = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }, []);

  const firstName = userName?.split(' ')[0] || '';
  const greetingPrefix =
    timeOfDay === 'morning' ? 'Good Morning' : timeOfDay === 'afternoon' ? 'Good Afternoon' : 'Good Evening';

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data: profile }, { data: integrationAccounts }] = await Promise.all([
        (supabase as any)
          .from('users')
          .select('name, energy_preference')
          .eq('id', user.id)
          .single(),
        supabase
          .from('integration_accounts_public' as 'integration_accounts')
          .select('provider, status')
          .eq('user_id', user.id),
      ]);

      if (profile?.name) setUserName(profile.name);
      if (profile?.energy_preference) setEnergyLevel(profile.energy_preference as any);

      const canvasConnected = integrationAccounts?.some(
        (a: { provider: string; status: string }) => a.provider === 'canvas' && a.status === 'connected'
      );
      const googleConnected = integrationAccounts?.some(
        (a: { provider: string; status: string }) => a.provider === 'google_calendar' && a.status === 'connected'
      );

      let canvasDueCount = 0;
      if (canvasConnected) {
        const sevenDaysOut = new Date(Date.now() + 7 * 86400000).toISOString();
        const { count } = await supabase
          .from('source_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('provider', 'canvas')
          .eq('item_type', 'assignment')
          .gte('due_date', new Date().toISOString())
          .lte('due_date', sevenDaysOut);
        canvasDueCount = count ?? 0;
      }

      setConnections({
        canvasConnected: !!canvasConnected,
        canvasDueCount,
        googleConnected: !!googleConnected,
      });

      const { data: taskRows } = await supabase
        .from('tasks')
        .select('id, title, completed, completed_at, due_date, priority, energy_level_required')
        .is('deleted_at', null)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      const currentTasks = (taskRows as unknown as MiniTask[]) ?? [];
      setTasks(currentTasks);

      const todayStr = new Date().toISOString().split('T')[0];
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      const upcomingDeadlineCount = currentTasks.filter(t => 
        !t.completed && t.due_date && 
        t.due_date >= todayStr && 
        t.due_date <= threeDaysFromNow.toISOString().split('T')[0]
      ).length;

      const tasksPlannedToday = currentTasks.filter(t => 
        t.due_date && t.due_date.startsWith(todayStr)
      ).length;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: metricsData } = await supabase
        .from('daily_user_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

      const metrics = metricsData || [];
      const mStats = calculateMomentumStats(metrics, upcomingDeadlineCount, tasksPlannedToday);
      setMomentumStats(mStats);

      const { data: blocksData } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .neq('status', 'rejected')
        .gte('start_time', new Date(new Date().setHours(0,0,0,0)).toISOString())
        .lte('start_time', new Date(new Date().setHours(23,59,59,999)).toISOString())
        .order('start_time', { ascending: true });

      if (blocksData && blocksData.length > 0) {
        const blocks = blocksData.map((g: any) => ({
          id: g.id,
          title: g.title,
          time: format(new Date(g.start_time), 'HH:mm'),
          duration: g.end_time ? Math.round((new Date(g.end_time).getTime() - new Date(g.start_time).getTime()) / 60000) : 30,
          type: (g.energy_level === 'low' ? 'break' : 'focus') as any,
          description: g.description || '',
          status: (g.status && g.status !== 'confirmed' ? g.status : g.metadata?.status || g.status) as any,
          is_ai_suggested: g.is_ai_suggested ?? g.metadata?.is_ai_suggested ?? true,
          startTime: g.start_time,
          endTime: g.end_time || new Date(new Date(g.start_time).getTime() + 30 * 60000).toISOString(),
          taskId: g.linked_task_id
        }));
        
        setSchedule(blocks);
        // Push next-action data to iOS Home Screen Widget
        const now = new Date();
        const parsed = blocks
          .map((b) => {
            const start = b.startTime || (b as any).suggested_start || (b as any).start_time;
            const end = b.endTime || (b as any).suggested_end || (b as any).end_time;
            const s = start ? new Date(start) : null;
            const e = end ? new Date(end) : s ? new Date(s.getTime() + (b.duration || 30) * 60000) : null;
            return s && !isNaN(s.getTime()) ? { title: b.title, s, e } : null;
          })
          .filter((x): x is { title: string; s: Date; e: Date | null } => x !== null);
        const current = parsed.find((b) => now >= b.s && b.e && now < b.e);
        const next = parsed.find((b) => b.s > now);
        const hit = current ?? next;
        writeWidgetData(
          hit
            ? { title: hit.title, startTime: hit.s, endTime: hit.e, status: current ? 'NOW' : 'UP NEXT' }
            : null
        );
      } else {
        writeWidgetData(null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();

    if (!user) return;

    const channel = supabase
      .channel('index_changes_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, () => {
        fetchAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${user.id}` }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const parsedSchedule = useMemo(() => {
    if (!schedule) return null;
    return schedule
      .map((b) => {
        const start = b.startTime || (b as any).suggested_start || (b as any).start_time;
        const end = b.endTime || (b as any).suggested_end || (b as any).end_time;
        const startDate = start ? new Date(start) : null;
        const endDate = end ? new Date(end) : null;
        if (!startDate || isNaN(startDate.getTime())) return null;
        return {
          ...b,
          _start: startDate,
          _end: endDate || new Date(startDate.getTime() + (b.duration || 30) * 60000),
        };
      })
      .filter((b): b is any => b !== null);
  }, [schedule]);

  const nextAction = useMemo(() => {
    if (!parsedSchedule) return null;
    const now = new Date();
    const current = parsedSchedule.find((b: any) => now >= b._start && now < b._end);
    if (current) return { ...current, status: 'NOW' as const };
    const next = parsedSchedule.find((b: any) => b._start > now);
    if (next) return { ...next, status: 'UP NEXT' as const };
    return null;
  }, [parsedSchedule]);


  const completeTask = async (taskId: string) => {
    // Dopamine hit!
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString(), status: 'done' })
      .eq('id', taskId);
    fetchAll();
  };

  const generatePlan = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Your session has expired. Please log out and log back in.');
      }
      
      let apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) {
        if (__DEV__) {
          apiUrl = 'http://localhost:3000';
        } else {
          throw new Error('EXPO_PUBLIC_API_URL is required in production builds.');
        }
      }
      const now = new Date();
      
      const response = await fetch(`${apiUrl}/api/ai/daily-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          energyLevel,
          localTime: now.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          todayStart: new Date(now.setHours(0,0,0,0)).toISOString(),
          todayEnd: new Date(now.setHours(23,59,59,999)).toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedPlan = data.schedule || data.plan || [];

      if (generatedPlan.length > 0) {
        await fetchAll();
      }
    } catch (err: any) {
      console.error('Plan generation error:', err);
      Alert.alert('Bruno Error', err.message || 'Failed to generate plan.');
    } finally {
      setGenerating(false);
    }
  };

  const incompleteTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.brand[500]} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
      accessibilityRole="none"
      accessibilityLabel="Today plan"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brand[500]}
          />
        }
      >
        {isOffline && (
          <View style={[styles.offlineBanner, { backgroundColor: Colors.error }]}>
            <Text style={styles.offlineText}>You're offline. Some features are unavailable.</Text>
          </View>
        )}
        {/* Header */}
        <View style={styles.header} testID="daily-plan-header">
          <View>
            <Text style={[styles.greetingText, { color: colors.text }]}>
              {greetingPrefix},{'\n'}
              {firstName || 'Pilot'}
            </Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={[styles.dayText, { color: colors.textMuted }]}>
              {format(new Date(), 'EEEE').toUpperCase()}
            </Text>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {format(new Date(), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>

        {/* Connection Chips */}
        <View style={styles.chipRow} testID="connection-chips">
          {connections.canvasConnected && (
            <ConnectionChip
              icon={<GraduationCap size={14} color={Colors.brand[600]} strokeWidth={2.5} />}
              label="Canvas"
              detail={`${connections.canvasDueCount} due`}
              connected
              colors={colors}
            />
          )}
          <ConnectionChip
            icon={<CalendarDays size={14} color={connections.googleConnected ? Colors.brand[600] : colors.textMuted} strokeWidth={2.5} />}
            label="Calendar"
            detail={connections.googleConnected ? 'Synced' : 'Connect'}
            connected={connections.googleConnected}
            colors={colors}
          />
        </View>

        {/* Next Action Hero */}
        <View testID="next-action-hero">
          {!nextAction ? (
            <View style={[styles.heroCard, { backgroundColor: isDark ? Colors.surface[800] : Colors.brand[50], borderColor: isDark ? Colors.surface[700] : Colors.surface[800] }]}>
              <View style={styles.heroBadgeRow}>
                <Sparkles size={14} color={Colors.brand[500]} strokeWidth={2.5} />
                <Text style={[styles.heroBadgeText, { color: Colors.brand[500] }]}>
                  {!schedule ? 'NO PLAN YET FOR TODAY' : 'ALL CAUGHT UP'}
                </Text>
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                Ready to focus?
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                Tell Bruno how you're feeling and you'll have a plan in seconds.
              </Text>

              {/* Energy Selector */}
              <View style={styles.energyRow} testID="energy-selector">
                <Text style={[styles.energyLabel, { color: colors.textMuted }]}>ENERGY:</Text>
                {(['low', 'medium', 'high'] as const).map((e) => (
                  <TouchableOpacity
                    key={e}
                    testID={`energy-${e}`}
                    onPress={() => setEnergyLevel(e)}
                    style={[
                      styles.energyPill,
                      {
                        backgroundColor: energyLevel === e ? Colors.surface[800] : 'transparent',
                        borderColor: energyLevel === e ? Colors.surface[800] : colors.separator,
                      },
                    ]}
                  >
                    <Zap
                      size={11}
                      color={energyLevel === e ? '#fff' : colors.textMuted}
                      strokeWidth={2.5}
                      fill={energyLevel === e ? '#fff' : 'none'}
                    />
                    <Text
                      style={[
                        styles.energyPillText,
                        { color: energyLevel === e ? '#fff' : colors.textMuted },
                      ]}
                    >
                      {e.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.ctaButton, 
                  { backgroundColor: generating ? colors.separator : Colors.brand[600] }
                ]}
                activeOpacity={0.85}
                testID="generate-plan-btn"
                onPress={generatePlan}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>Generate Today's Plan</Text>
                    <ArrowRight size={16} color="#fff" strokeWidth={2.5} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.heroCard, { backgroundColor: isDark ? Colors.surface[800] : colors.card, borderColor: isDark ? Colors.surface[700] : Colors.surface[800] }]} testID="next-action-card">
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: nextAction.status === 'NOW' ? Colors.brand[50] : Colors.accent[50],
                    borderColor: nextAction.status === 'NOW' ? Colors.brand[500] : Colors.accent[500],
                  },
                ]}
              >
                <Clock size={12} color={nextAction.status === 'NOW' ? Colors.brand[600] : Colors.accent[600]} strokeWidth={2.5} />
                <Text
                  style={[
                    styles.statusText,
                    { color: nextAction.status === 'NOW' ? Colors.brand[600] : Colors.accent[600] },
                  ]}
                >
                  {nextAction.status}
                </Text>
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]} testID="next-action-title">
                {nextAction.title}
              </Text>
              <Text style={[styles.heroTimeText, { color: colors.textSecondary }]}>
                {format(nextAction._start, 'h:mm a')} → {format(nextAction._end, 'h:mm a')}
              </Text>
              <View style={styles.actionRow}>
                {nextAction.taskId && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.brand[500] }]}
                    onPress={() => completeTask(nextAction.taskId!)}
                    testID="complete-next-btn"
                  >
                    <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.actionBtnText}>Mark Done</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.surface[900] }]}
                  onPress={() => router.push('/deep-work')}
                  testID="start-deep-work-btn"
                >
                  <Clock size={14} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.actionBtnText}>Deep Work</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Full Day Plan Expander */}
        {parsedSchedule && parsedSchedule.length > 0 && (
          <View testID="full-day-section">
            <TouchableOpacity
              style={styles.expanderButton}
              onPress={() => setShowFullPlan(!showFullPlan)}
              testID="full-day-toggle"
            >
              <Text style={[styles.expanderLabel, { color: colors.textMuted }]}>
                VIEW TODAY'S FULL PLAN ({parsedSchedule.length} BLOCKS)
              </Text>
              <ChevronDown
                size={14}
                color={colors.textMuted}
                strokeWidth={2.5}
                style={{ transform: [{ rotate: showFullPlan ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            {showFullPlan && (
              <View style={styles.blockList} testID="full-day-list">
                {parsedSchedule.map((block: any, idx: number) => (
                  <View
                    key={block.id || idx}
                    style={[styles.blockItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    testID={`full-day-block-${idx}`}
                  >
                    <Text style={[styles.blockTime, { color: colors.textMuted }]}>
                      {format(block._start, 'h:mm a')}
                    </Text>
                    <Text style={[styles.blockTitle, { color: colors.text }]} numberOfLines={1}>
                      {block.title}
                    </Text>
                    <Text style={[styles.blockDuration, { color: colors.textMuted }]}>
                      {Math.round((block._end.getTime() - block._start.getTime()) / 60000)} min
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }} testID="dashboard-stats">
          <StatCard icon={<Clock size={16} color={Colors.brand[500]} strokeWidth={2.5} />} label="Focus Min" value={momentumStats.focusTimeMinutes} colors={colors} testID="stat-focus" />
          <StatCard icon={<CheckCircle2 size={16} color={Colors.brand[500]} strokeWidth={2.5} />} label="Crushed" value={momentumStats.tasksCrushed} colors={colors} testID="stat-crushed" />
          <StatCard icon={<Target size={16} color={Colors.error} strokeWidth={2.5} />} label="Deadlines" value={momentumStats.upcomingDeadlines} colors={colors} testID="stat-deadlines" />
          <StatCard icon={<Zap size={16} color={Colors.brand[500]} strokeWidth={2.5} />} label="Consistency" value={`${momentumStats.consistencyPercent}%` as any} colors={colors} testID="stat-consistency" />
        </View>

        {/* Tasks Expander */}
        <View testID="today-tasks-section">
          <TouchableOpacity
            style={styles.expanderButton}
            onPress={() => setShowTasks(!showTasks)}
            testID="today-tasks-toggle"
          >
            <Text style={[styles.expanderLabel, { color: colors.textMuted }]}>
              TODAY'S TASKS ({incompleteTasks.length})
            </Text>
            <ChevronDown
              size={14}
              color={colors.textMuted}
              strokeWidth={2.5}
              style={{ transform: [{ rotate: showTasks ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>
          {showTasks && (
            <View style={styles.blockList} testID="today-tasks-list">
              {incompleteTasks.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Nothing on the list. Enjoy the calm.
                </Text>
              ) : (
                incompleteTasks.slice(0, 8).map((task) => (
                  <View
                    key={task.id}
                    style={[styles.taskRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    testID={`task-row-${task.id}`}
                  >
                    <TouchableOpacity
                      style={[styles.taskCheckbox, { borderColor: colors.separator }]}
                      onPress={() => completeTask(task.id)}
                      testID={`task-complete-${task.id}`}
                    />
                    <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>
                      {task.title}
                    </Text>
                    {task.priority === 'high' || task.priority === 'critical' ? (
                      <View style={[styles.priorityDot, { backgroundColor: Colors.error }]} />
                    ) : null}
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ConnectionChip({
  icon,
  label,
  detail,
  connected,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  connected: boolean;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.chip,
        {
          borderColor: connected ? Colors.brand[300] : colors.separator,
          backgroundColor: connected ? `${Colors.brand[500]}10` : colors.card,
        },
      ]}
    >
      {icon}
      <Text style={[styles.chipLabel, { color: connected ? Colors.brand[600] : colors.textSecondary }]}>
        {label}
      </Text>
      <View style={[styles.chipDetailBg, { backgroundColor: connected ? `${Colors.brand[500]}20` : colors.separator + '30' }]}>
        <Text style={[styles.chipDetail, { color: connected ? Colors.brand[600] : colors.textMuted }]}>
          {connected ? '✓' : '+'} {detail}
        </Text>
      </View>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  colors,
  testID,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colors: any;
  testID: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} testID={testID}>
      <View style={styles.statTop}>
        {icon}
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label.toUpperCase()}</Text>
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  offlineBanner: { padding: 8, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  greetingText: { fontSize: 26, fontWeight: '900', letterSpacing: -1.2, lineHeight: 30 },
  dateBlock: { alignItems: 'flex-end' },
  dayText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  dateText: { fontSize: 13, fontWeight: '800' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  chipLabel: { fontSize: 12, fontWeight: '700' },
  chipDetailBg: { borderRadius: 100, paddingHorizontal: 6, paddingVertical: 2 },
  chipDetail: { fontSize: 10, fontWeight: '800' },
  heroCard: {
    borderWidth: 2,
    borderRadius: 20,
    padding: 24,
  },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  heroBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -1, marginBottom: 6, lineHeight: 30 },
  heroSubtitle: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 16 },
  heroTimeText: { fontSize: 13, fontWeight: '700', marginTop: 4, marginBottom: 16 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  energyLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginRight: 4 },
  energyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  energyPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  expanderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  expanderLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  blockList: { gap: 6, marginTop: 4 },
  blockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  blockTime: { fontSize: 10, fontWeight: '900', letterSpacing: 1, width: 70 },
  blockTitle: { flex: 1, fontSize: 13, fontWeight: '700' },
  blockDuration: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  statValue: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
  },
  taskTitle: { flex: 1, fontSize: 13, fontWeight: '700' },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  emptyText: { fontSize: 13, fontWeight: '500', fontStyle: 'italic', textAlign: 'center', paddingVertical: 24 },
});
