'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseSupabaseTableRealtimeOptions {
  userId?: string;
  tables: string[];
  onChange: () => void;
  debounceMs?: number;
}

function channelTopic(channelName: string): string {
  return `realtime:${channelName}`;
}

/**
 * Subscribes to postgres_changes for user-scoped tables.
 * Skips refetch while an optimistic mutation is in-flight (via guard ref).
 */
export function useSupabaseTableRealtime({
  userId,
  tables,
  onChange,
  debounceMs = 400,
}: UseSupabaseTableRealtimeOptions) {
  const optimisticGuard = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const tablesKey = tables.join(',');

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOptimisticStart = () => {
      optimisticGuard.current += 1;
    };
    const onOptimisticEnd = () => {
      optimisticGuard.current = Math.max(0, optimisticGuard.current - 1);
    };

    window.addEventListener('planevo:optimistic-mutation-start', onOptimisticStart);
    window.addEventListener('planevo:optimistic-mutation-end', onOptimisticEnd);

    return () => {
      window.removeEventListener('planevo:optimistic-mutation-start', onOptimisticStart);
      window.removeEventListener('planevo:optimistic-mutation-end', onOptimisticEnd);
    };
  }, []);

  useEffect(() => {
    const tableList = tablesKey.split(',').filter(Boolean);
    if (!userId || tableList.length === 0) return;

    const channelName = `realtime-${userId}-${tablesKey}`;
    const supabase = createClient();
    const topic = channelTopic(channelName);

    // Tear down any leftover channel with the same topic (effect re-run / Strict Mode).
    for (const existing of supabase.getChannels()) {
      if (existing.topic === topic) {
        void supabase.removeChannel(existing);
      }
    }

    const channel = supabase.channel(channelName);

    const scheduleRefetch = () => {
      if (optimisticGuard.current > 0) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (optimisticGuard.current === 0) {
          onChangeRef.current();
        }
      }, debounceMs);
    };

    for (const table of tableList) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        scheduleRefetch
      );
    }

    channel.subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [userId, tablesKey, debounceMs]);
}

export function signalOptimisticMutationStart() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('planevo:optimistic-mutation-start'));
}

export function signalOptimisticMutationEnd() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('planevo:optimistic-mutation-end'));
}
