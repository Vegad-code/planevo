'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CalendarPreferences } from '@/types/calendar';

const DEFAULT_PREFERENCES: CalendarPreferences = {
  user_id: '',
  default_view: 'day',
  week_starts_on: 'sunday',
  time_format: '12h',
  day_start_hour: 0,
  day_end_hour: 24,
  show_weekends: true,
  show_google_calendar: true,
  show_canvas: true,
  show_blueprint: true,
  show_schedule: true,
  show_cargo_bay: true,
  show_focus_blocks: true,
  show_completed: true,
};

export function useCalendarPreferences() {
  const [preferences, setPreferences] = useState<CalendarPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data } = await supabase
        .from('calendar_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        // Map DB columns to our interface shape
        setPreferences({
          ...DEFAULT_PREFERENCES,
          user_id: data.user_id,
          default_view: (data.default_view as CalendarPreferences['default_view']) || 'day',
          day_start_hour: data.start_hour ?? 0,
          day_end_hour: data.end_hour ?? 24,
          show_completed: data.show_completed ?? true,
        });
      }
    } catch {
      // Use defaults if no preferences exist
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const updatePreferences = useCallback(async (updates: Partial<CalendarPreferences>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const newPrefs = { ...preferences, ...updates, user_id: user.id };
      
      // Optimistic update
      setPreferences(newPrefs);

      // Map back to DB column names
      const { error } = await supabase
        .from('calendar_preferences')
        .upsert({
          user_id: user.id,
          default_view: newPrefs.default_view,
          start_hour: newPrefs.day_start_hour,
          end_hour: newPrefs.day_end_hour,
          show_completed: newPrefs.show_completed,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to update calendar preferences:', error);
        // Revert optimistic update
        setPreferences(preferences);
      }
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  }, [supabase, preferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    updatePreferences,
  };
}
