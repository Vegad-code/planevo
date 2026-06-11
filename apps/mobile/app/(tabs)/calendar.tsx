import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { RefreshCw, ListTodo, Clock } from 'lucide-react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import MobileCalendar, { MobileCalendarEvent } from '@/components/calendar/MobileCalendar';

export default function CalendarScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [events, setEvents] = useState<MobileCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [syncing, setSyncing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [backlogTasks, setBacklogTasks] = useState<any[]>([]);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch +/- 30 days
      const startRange = new Date();
      startRange.setDate(startRange.getDate() - 30);
      const endRange = new Date();
      endRange.setDate(endRange.getDate() + 30);

      const { data: blocksData, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .neq('status', 'rejected')
        .gte('start_time', startRange.toISOString())
        .lte('start_time', endRange.toISOString());

      if (error) throw error;

      if (blocksData) {
        const mapped = blocksData.map((ev) => {
          let color = colors.tint;
          if (ev.source === 'google_calendar') color = '#5B8DCF';
          else if (ev.source === 'canvas') color = '#C56B5E';
          else if (ev.source === 'blueprint') color = '#6B8B69';
          else if (ev.source === 'cargo_bay') color = '#7c5cbf';
          else if (ev.source === 'focus_block') color = '#B96E2A';

          return {
            id: ev.id,
            title: ev.title,
            start: new Date(ev.start_time),
            end: ev.end_time ? new Date(ev.end_time) : new Date(new Date(ev.start_time).getTime() + 30 * 60000),
            color,
            source: ev.source || undefined,
          };
        });
        setEvents(mapped);
      }
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setLoading(false);
    }
  }, [user, colors]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const fetchBacklog = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (data) setBacklogTasks(data);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);


  
  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("API URL not configured");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`${apiUrl}/api/integrations/google/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });
      if (!response.ok) throw new Error("Sync failed");
      
      await fetchEvents();
      Alert.alert("Success", "Calendar synced successfully!");
    } catch (err) {
      console.error(err);
      Alert.alert("Sync Error", "Could not sync calendar.");
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoSchedule = async () => {
    if (!user || backlogTasks.length === 0) return;
    setIsScheduling(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("API URL not configured");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`${apiUrl}/api/ai/daily-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          energyLevel: 'medium',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localTime: new Date().toISOString(),
        })
      });
      
      if (!response.ok) throw new Error("Scheduling failed");
      
      await fetchEvents();
      await fetchBacklog();
      Alert.alert("Success", "Bruno has optimized your schedule!");
      bottomSheetRef.current?.close();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not auto-schedule tasks.");
    } finally {
      setIsScheduling(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Calendar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => bottomSheetRef.current?.expand()} style={styles.actionBtn}>
            <ListTodo size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSync} disabled={syncing} style={styles.actionBtn}>
            <RefreshCw size={24} color={syncing ? colors.textMuted : colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <MobileCalendar
        events={events}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onEventPress={(ev) => console.log('Event pressed:', ev.title)}
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['50%', '90%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
        )}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHeaderRow}>
            <Text style={[styles.sheetTitle, { color: colors.text, marginBottom: 0 }]}>Task Backlog</Text>
            {backlogTasks.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.tint }]}>
                <Text style={styles.badgeText}>{backlogTasks.length}</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
            {backlogTasks.length === 0 
              ? "All caught up! No pending tasks." 
              : "These tasks are waiting to be scheduled."}
          </Text>

          {backlogTasks.length > 0 && (
            <TouchableOpacity 
              style={[styles.autoScheduleBtn, { backgroundColor: colors.text }]}
              onPress={handleAutoSchedule}
              disabled={isScheduling}
            >
              {isScheduling ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <>
                  <Clock size={16} color={colors.background} />
                  <Text style={[styles.autoScheduleBtnText, { color: colors.background }]}>
                    Auto-Schedule with Bruno
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.taskList}>
            {backlogTasks.map(task => (
              <View key={task.id} style={[styles.taskItem, { borderBottomColor: colors.separator }]}>
                <View style={styles.taskItemLeft}>
                  <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                  <View style={styles.taskMeta}>
                    {task.estimated_minutes && (
                      <View style={styles.metaBadge}>
                        <Clock size={10} color={colors.textMuted} />
                        <Text style={[styles.metaBadgeText, { color: colors.textMuted }]}>{task.estimated_minutes}m</Text>
                      </View>
                    )}
                    {task.energy_level_required && (
                      <View style={styles.metaBadge}>
                        <Text style={[styles.metaBadgeText, { color: colors.textMuted }]}>{task.energy_level_required}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {task.priority === 'high' && <Text style={styles.highPriority}>HIGH</Text>}
              </View>
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    padding: 4,
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 60,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 24,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    fontStyle: 'italic',
  },
  highPriority: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  autoScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  autoScheduleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  taskList: {
    gap: 0,
  },
  taskItemLeft: {
    flex: 1,
    gap: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.2)',
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  }
});
