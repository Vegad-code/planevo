'use client';

import OllieAvatar from '@/components/ollie/OllieAvatar';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { useCallback } from 'react';

interface ScheduleBlock {
  time: string;
  title: string;
  type: string;
  description?: string;
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleBlock[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackLogged, setFeedbackLogged] = useState(false);

  const supabase = createClient();

  const logFeedback = useCallback(async (action: 'accept' | 'reject', correction?: string) => {
    if (!schedule || feedbackLogged) return;
    
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'daily_schedule',
          suggestion_json: schedule,
          action,
          correction_text: correction,
        }),
      });
      setFeedbackLogged(true);
      if (action === 'accept') {
        alert('Thanks! Ollie is learning your preferences.');
      }
    } catch (err) {
      console.error('Failed to log feedback:', err);
    }
  }, [schedule, feedbackLogged]);

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('schedules')
          .select('schedule_json')
          .eq('user_id', user.id)
          .eq('date', format(new Date(), 'yyyy-MM-dd'))
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          setSchedule(data[0].schedule_json as unknown as ScheduleBlock[]);
        }
      }
      setLoading(false);
    }
    loadSchedule();
  }, []);

  async function generateSchedule() {
    // This now redirects to briefing if no schedule exists, 
    // or we could implement a quick re-gen here.
    window.location.href = '/dashboard/briefing';
  }

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'focus':
        return 'border-accent-500 bg-accent-500/10 text-accent-600';
      case 'break':
        return 'border-green-500 bg-green-500/10 text-green-600';
      case 'event':
        return 'border-brand-500 bg-brand-500/10 text-brand-600';
      default:
        return 'border-surface-900 bg-surface-200 text-surface-900';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900 uppercase tracking-tight">Schedule</h1>
        <div className="flex items-center gap-2">
          <button
            id="schedule-today-button"
            className="px-3 py-1.5 text-sm text-surface-500 hover:text-surface-900 bg-surface-200 hover:bg-surface-300 rounded-lg transition-colors font-bold uppercase"
          >
            Today
          </button>
          <button
            id="schedule-generate-button"
            onClick={generateSchedule}
            disabled={loading}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Planning...
              </span>
            ) : (
              '🦉 Ask Ollie to plan'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-surface-100 border-2 border-surface-900 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-[var(--shadow-color)]">
          <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
          <h2 className="mt-4 text-lg font-semibold text-surface-900 uppercase">Ollie is planning your day...</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-sm">
            Reviewing your tasks, checking your priorities, and finding the best times to focus.
          </p>
        </div>
      ) : schedule ? (
        <div className="glass rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <OllieAvatar mood="happy" size="md" />
            <p className="text-surface-600 text-sm">
              Here is a balanced plan for your day. Remember to take your breaks!
            </p>
          </div>
          
          <div className="space-y-4">
            {schedule.map((block, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors border border-surface-200"
              >
                <div className="sm:w-32 shrink-0 text-sm font-medium text-surface-500 pt-1">
                  {block.time}
                </div>
                <div className="flex-1">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-surface-900 font-bold text-lg uppercase leading-tight">{block.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(block.type)}`}>
                      {block.type}
                    </span>
                  </div>
                  {block.description && (
                    <p className="mt-2 text-sm text-surface-600">
                      {block.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 mt-6 border-t border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-surface-500 italic uppercase tracking-wider">
              Feedback helps Ollie learn your style
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  const msg = prompt("What's wrong with this schedule? (Optional)");
                  logFeedback('reject', msg || undefined);
                  setSchedule(null);
                }}
                className="flex-1 sm:flex-none px-6 py-2 bg-surface-200 hover:bg-surface-300 text-surface-700 text-sm font-bold rounded-xl transition-all uppercase"
              >
                I need changes
              </button>
              <button
                onClick={() => logFeedback('accept')}
                disabled={feedbackLogged}
                className="flex-1 sm:flex-none px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl transition-all shadow-md uppercase disabled:opacity-50"
              >
                {feedbackLogged ? 'Feedback Recorded' : 'This looks good'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-100 border-2 border-surface-900 shadow-[var(--shadow-color)] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <OllieAvatar mood="thinking" size="lg" />
          <h2 className="mt-4 text-lg font-semibold text-surface-900 uppercase">No schedule yet</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-sm">
            Add some tasks first, then I'll build you a smart daily plan. I'll work around your calendar and energy levels.
          </p>
        </div>
      )}
    </div>
  );
}
