'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useDeepWorkTimer } from '@/hooks/use-deep-work-timer';
import { DeepWorkTimerUI } from '@/components/deep-work/timer-ui';

function DeepWorkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') || searchParams.get('taskId');
  
  const supabase = useMemo(() => createClient(), []);
  const [taskName, setTaskName] = useState<string>('Deep Work Session');
  const [duration, setDuration] = useState<number>(25); // default 25 min
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      if (!eventId) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('calendar_events')
          .select('title, start_time, end_time')
          .eq('id', eventId)
          .single();
          
        if (data && !error) {
          setTaskName(data.title || 'Deep Work Session');
          if (data.start_time && data.end_time) {
            const start = new Date(data.start_time).getTime();
            const end = new Date(data.end_time).getTime();
            const diffMinutes = Math.max(1, Math.round((end - start) / 60000));
            setDuration(diffMinutes);
          }
        }
      } catch (err) {
        console.error('Failed to load event for deep work:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [eventId, supabase]);

  const handleComplete = useCallback((focusTimeSeconds: number) => {
    // Fire-and-forget: save to daily_user_metrics (non-blocking)
    fetch('/api/metrics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'focus_time', value: focusTimeSeconds }),
    }).catch(e => console.error('Error tracking focus time metric:', e));

    // Fire-and-forget: update calendar event metadata (legacy, non-blocking)
    if (eventId) {
      (async () => {
        try {
          const { data: event } = await supabase
            .from('calendar_events')
            .select('metadata')
            .eq('id', eventId)
            .single();

          const currentMetadata = (event?.metadata as Record<string, any>) || {};
          const newMetadata = {
             ...currentMetadata,
             focusTimeSeconds: (currentMetadata.focusTimeSeconds || 0) + focusTimeSeconds
          };

          await supabase
            .from('calendar_events')
            .update({ 
              status: 'confirmed',
              metadata: newMetadata
            }) 
            .eq('id', eventId);
        } catch (e) {
          console.error('Error updating event:', e);
        }
      })();
    }
  }, [eventId, supabase]);

  const timer = useDeepWorkTimer(duration, () => {
    // When natural timer finishes
    handleComplete(timer.totalElapsedFocusTime);
  });

  const handleExit = () => {
    if (timer.totalElapsedFocusTime > 0) {
      handleComplete(timer.totalElapsedFocusTime);
    }
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-honey)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <DeepWorkTimerUI 
      timer={timer} 
      taskName={taskName} 
      onExit={handleExit} 
      totalSeconds={duration * 60}
    />
  );
}

export default function DeepWorkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg-dark)]" />}>
      <DeepWorkContent />
    </Suspense>
  );
}
