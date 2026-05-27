import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <MobileCalendar
        events={events}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onEventPress={(ev) => console.log('Event pressed:', ev.title)}
      />
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
});
