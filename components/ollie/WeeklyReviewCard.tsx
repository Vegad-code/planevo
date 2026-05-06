'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendUp, Brain, Lightning, CalendarCheck } from '@phosphor-icons/react';
import OllieAvatar from '../ollie/OllieAvatar';

interface WeeklyReviewData {
  headline: string;
  summary: string;
  insights: string[];
  ollie_learned: string;
  suggestion: string;
  energy_pattern: string;
  stats: {
    tasks_completed: number;
    total_focus_minutes: number;
    feedback_given: number;
  };
  vibe: string;
}

/**
 * WeeklyReviewCard
 * 
 * Generates and displays a weekly productivity review from Ollie.
 * Calls the /api/ai/weekly-review endpoint which runs entirely server-side.
 * No API keys are exposed to the client.
 */
export default function WeeklyReviewCard() {
  const [review, setReview] = useState<WeeklyReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function generateReview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/weekly-review', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate review');
      }
      const data = await res.json();
      setReview(data.review);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // Collapsed state — just a trigger button
  if (!expanded) {
    return (
      <motion.button
        onClick={generateReview}
        disabled={loading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full glass border-2 border-surface-200 hover:border-brand-300 p-6 rounded-2xl shadow-[4px_4px_0_0_var(--surface-100)] hover:shadow-[6px_6px_0_0_var(--brand-100)] transition-all group text-left relative overflow-hidden disabled:opacity-60"
      >
        <div className="absolute -bottom-8 -right-8 opacity-5 group-hover:opacity-10 transition-all duration-500">
          <TrendUp size={120} weight="fill" className="text-brand-500" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <OllieAvatar mood="happy" size="sm" />
          <div className="flex-1">
            <h3 className="font-black uppercase tracking-tight text-sm text-foreground">
              {loading ? 'Analyzing your week...' : 'Weekly Review'}
            </h3>
            <p className="text-xs text-muted italic mt-0.5">
              {loading ? 'Ollie is crunching the numbers' : 'See what Ollie learned about you this week'}
            </p>
          </div>
          {loading && (
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        {error && (
          <p className="text-xs text-error mt-3 font-bold">{error}</p>
        )}
      </motion.button>
    );
  }

  // Expanded state — full review
  if (!review) return null;

  const vibeEmoji: Record<string, string> = {
    Grinding: '🔥', Flowing: '🌊', Building: '🏗️', Recovering: '🧘',
    Pushing: '💪', Cruising: '🛳️', Sprinting: '🏃', Reflecting: '🪞',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass border-2 border-brand-200 bg-gradient-to-br from-brand-50/30 to-accent-50/20 rounded-2xl shadow-[6px_6px_0_0_var(--brand-100)] overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 pb-4 border-b border-brand-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OllieAvatar mood="happy" size="sm" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-500 flex items-center gap-1">
                <CalendarCheck size={14} weight="bold" />
                Weekly Review
              </span>
              <h3 className="text-xl font-black uppercase tracking-tighter text-foreground mt-0.5">
                {review.headline}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-xl border border-brand-100">
            <span className="text-lg">{vibeEmoji[review.vibe] || '✨'}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-600">{review.vibe}</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 divide-x divide-brand-100 bg-white/30">
        <div className="p-4 text-center">
          <div className="text-2xl font-black text-brand-600">{review.stats.tasks_completed}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mt-0.5">Tasks Done</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-2xl font-black text-accent-600">{review.stats.total_focus_minutes}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mt-0.5">Focus Min</div>
        </div>
        <div className="p-4 text-center">
          <div className="text-2xl font-black text-info">{review.stats.feedback_given}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted mt-0.5">Feedback</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        {/* Summary */}
        <p className="text-sm text-foreground font-medium leading-relaxed">{review.summary}</p>

        {/* Insights */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
            <Lightning size={14} weight="fill" className="text-accent-500" />
            Key Insights
          </h4>
          <div className="space-y-2">
            {review.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-accent-500 font-black mt-0.5">→</span>
                <span className="font-medium">{insight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What Ollie Learned */}
        <div className="bg-white/50 border border-brand-100 rounded-xl p-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-500 flex items-center gap-1.5 mb-2">
            <Brain size={14} weight="fill" />
            What Ollie Learned
          </h4>
          <p className="text-sm text-foreground font-medium italic">{review.ollie_learned}</p>
        </div>

        {/* Energy Pattern */}
        <div className="text-xs text-muted">
          <span className="font-black uppercase tracking-widest">Energy Pattern:</span>{' '}
          <span className="font-medium italic">{review.energy_pattern}</span>
        </div>

        {/* Suggestion */}
        <div className="bg-surface-900 text-white p-4 rounded-xl shadow-[4px_4px_0_0_var(--accent-500)]">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent-400">Suggestion for Next Week</span>
          <p className="text-sm font-bold mt-1">{review.suggestion}</p>
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setExpanded(false)}
          className="w-full text-center text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground transition-colors py-2"
        >
          Collapse Review
        </button>
      </div>
    </motion.div>
  );
}
