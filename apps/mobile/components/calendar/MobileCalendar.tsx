import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import CalendarKit from '@howljs/calendar-kit';
import { useTheme } from '@/hooks/useTheme';
import { Colors } from '@/constants/Colors';

export interface MobileCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  source?: string;
}

interface MobileCalendarProps {
  events: MobileCalendarEvent[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onEventPress?: (event: MobileCalendarEvent) => void;
  onLongPressEmpty?: (date: Date) => void;
}

export default function MobileCalendar({
  events,
  selectedDate,
  onDateChange,
  onEventPress,
  onLongPressEmpty,
}: MobileCalendarProps) {
  const { colors } = useTheme();

  // Map to calendar-kit format
  const mappedEvents = useMemo(() => {
    return events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      start: { dateTime: ev.start.toISOString() },
      end: { dateTime: ev.end.toISOString() },
      color: ev.color || colors.tint,
      _original: ev,
    }));
  }, [events, colors]);

  const theme = useMemo(() => ({
    colors: {
      primary: colors.tint,
      onPrimary: '#FFFFFF',
      background: colors.background,
      onBackground: colors.text,
      border: colors.separator,
      text: colors.text,
      surface: colors.card,
      onSurface: colors.text,
    },
    nowIndicatorColor: Colors.error,
    hourBackgroundColor: colors.background,
    headerBackgroundColor: colors.background,
  }), [colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CalendarKit
        events={mappedEvents}
        theme={theme}
        onPressEvent={(event: any) => onEventPress?.(event._original)}
        onLongPressEvent={(event: any) => onEventPress?.(event._original)}
        onLongPressBackground={(props: any) => {
          const dt = props.dateTime || props.date;
          if (dt) onLongPressEmpty?.(new Date(dt));
        }}
        onDateChanged={(date: string) => onDateChange(new Date(date))}
        initialDate={selectedDate.toISOString()}
        numberOfDays={7}
        overlapEventsSpacing={2}
        rightEdgeSpacing={4}
        useHaptic
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
