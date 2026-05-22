'use client';

import BrunoAvatar from '@/components/bruno/BrunoAvatar';

export default function HabitsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900 uppercase tracking-tight">Habits</h1>
        <button
          id="habits-add-button"
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-[0.98] flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Habit
        </button>
      </div>

      {/* Empty state */}
      <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-surface-100 border-2 border-surface-900 shadow-[var(--shadow-color)]">
        <BrunoAvatar mood="happy" size="lg" />
        <h2 className="mt-4 text-lg font-semibold text-surface-900 uppercase">No habits tracked yet</h2>
        <p className="mt-2 text-surface-600 text-sm max-w-sm font-medium">
          Consistency beats perfection. Pick one small habit and I&apos;ll help you stick with it — no guilt, just progress.
        </p>
        <button
          id="habits-empty-add-button"
          className="mt-6 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
        >
          + Track your first habit
        </button>
      </div>
    </div>
  );
}
