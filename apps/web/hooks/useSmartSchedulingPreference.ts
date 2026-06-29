'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'planevo.smart_scheduling_from_text';

export interface SmartSchedulingPreferences {
  smart_scheduling_from_text: boolean;
  date_order: 'month-first' | 'day-first';
  week_starts_on: 'sunday' | 'monday';
}

const DEFAULT_PREFS: SmartSchedulingPreferences = {
  smart_scheduling_from_text: true,
  date_order: 'month-first',
  week_starts_on: 'sunday',
};

export function useSmartSchedulingPreference() {
  const [prefs, setPrefs] = useState<SmartSchedulingPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as Partial<SmartSchedulingPreferences>;
          if (!cancelled) {
            setPrefs({ ...DEFAULT_PREFS, ...parsed });
          }
        }

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data } = await supabase
          .from('users')
          .select('scheduling_preferences')
          .eq('id', user.id)
          .maybeSingle();

        const scheduling = (data?.scheduling_preferences ?? {}) as Record<string, unknown>;
        const merged: SmartSchedulingPreferences = {
          smart_scheduling_from_text:
            scheduling.smart_scheduling_from_text !== false,
          date_order:
            scheduling.date_order === 'day-first' ? 'day-first' : 'month-first',
          week_starts_on:
            scheduling.week_starts_on === 'monday' ? 'monday' : 'sunday',
        };

        if (!cancelled) {
          setPrefs(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback(async (next: Partial<SmartSchedulingPreferences>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from('users')
      .select('scheduling_preferences')
      .eq('id', user.id)
      .maybeSingle();

    const current = (existing?.scheduling_preferences ?? {}) as Record<string, unknown>;
    await supabase
      .from('users')
      .update({
        scheduling_preferences: { ...current, ...next },
      })
      .eq('id', user.id);
  }, [prefs]);

  return {
    prefs,
    loading,
    smartSchedulingEnabled: prefs.smart_scheduling_from_text,
    setSmartSchedulingEnabled: (enabled: boolean) =>
      updatePrefs({ smart_scheduling_from_text: enabled }),
    updatePrefs,
  };
}
