'use client';

import { useState } from 'react';
import OllieAvatar from '@/components/ollie/OllieAvatar';

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

  async function generateSchedule() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to generate schedule');
      }
      if (data.schedule && data.schedule.length > 0) {
        setSchedule(data.schedule);
      } else {
        setError(data.message || 'No schedule generated.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'focus':
        return 'border-brand-500/50 bg-brand-500/10 text-brand-400';
      case 'break':
        return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
      case 'routine':
        return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
      case 'flexible':
        return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
      default:
        return 'border-surface-500 bg-surface-700 text-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <div className="flex items-center gap-2">
          <button
            id="schedule-today-button"
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors"
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
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <OllieAvatar mood="thinking" size="lg" />
          <h2 className="mt-4 text-lg font-semibold text-white">Ollie is planning your day...</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-sm">
            Reviewing your tasks, checking your priorities, and finding the best times to focus.
          </p>
        </div>
      ) : schedule ? (
        <div className="glass rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <OllieAvatar mood="happy" size="md" />
            <p className="text-slate-300 text-sm">
              Here is a balanced plan for your day. Remember to take your breaks!
            </p>
          </div>
          
          <div className="space-y-4">
            {schedule.map((block, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 rounded-xl bg-surface-800/50 hover:bg-surface-700/50 transition-colors border border-surface-600/50"
              >
                <div className="sm:w-32 shrink-0 text-sm font-medium text-slate-400 pt-1">
                  {block.time}
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <h3 className="text-white font-medium text-lg">{block.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(block.type)}`}>
                      {block.type}
                    </span>
                  </div>
                  {block.description && (
                    <p className="mt-2 text-sm text-slate-400">
                      {block.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <OllieAvatar mood="gentle" size="lg" />
          <h2 className="mt-4 text-lg font-semibold text-white">No schedule yet</h2>
          <p className="mt-2 text-slate-400 text-sm max-w-sm">
            Add some tasks first, then I'll build you a smart daily plan. I'll work around your calendar and energy levels.
          </p>
        </div>
      )}
    </div>
  );
}
