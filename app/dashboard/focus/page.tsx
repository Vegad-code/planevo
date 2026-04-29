'use client';

import { useEffect, useCallback } from 'react';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import { useFocusStore } from '@/store/useFocusStore';
import { useRouter } from 'next/navigation';

const TIMER_PRESETS = [
  { label: 'Pomodoro', minutes: 25 },
  { label: 'Short Break', minutes: 5 },
  { label: 'Long Break', minutes: 15 },
  { label: 'Deep Work', minutes: 50 },
];

export default function FocusPage() {
  const router = useRouter();
  const {
    activeTask,
    timeLeft,
    totalTime,
    timerState,
    sessionsCompleted,
    setActiveTask,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    tick,
    completeSession
  } = useFocusStore();

  // Tick the timer globally
  useEffect(() => {
    if (timerState === 'running') {
      const interval = setInterval(() => {
        if (timeLeft <= 1) {
          completeSession();
        } else {
          tick();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerState, timeLeft, tick, completeSession]);

  function handleStart() {
    if (timerState === 'paused') {
      resumeTimer();
    } else {
      startTimer();
    }
  }

  function handlePause() {
    pauseTimer();
  }

  function handleReset() {
    resetTimer();
  }

  function selectPreset(index: number) {
    if (timerState !== 'idle') return;
    const minutes = TIMER_PRESETS[index].minutes;
    // We update the totalTime by starting the timer but immediately pausing it if they just selected it?
    // Actually, store allows passing minutes to startTimer. We can just set it.
    // For a better UX, maybe we need a setTimer action in store, but we can hack it by starting and resetting.
    startTimer(minutes);
    pauseTimer();
    resetTimer(); // This puts it back to idle with the new totalTime
  }

  function handleClearTask() {
    setActiveTask(null);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const ollieMood = timerState === 'running' ? 'thinking' as const
    : timeLeft === 0 && sessionsCompleted > 0 ? 'celebrating' as const
    : 'gentle' as const;

  const ollieMessage = timerState === 'running' && activeTask
    ? `Focusing on: "${activeTask.title}". You've got this!`
    : timerState === 'running'
    ? "You're doing great. Stay with it."
    : timeLeft === 0 && sessionsCompleted > 0
    ? "Session complete! Nice work. Take a breather."
    : timerState === 'paused'
    ? "Paused. Take your time, I'll be here."
    : activeTask 
    ? `Ready to crush "${activeTask.title}"?`
    : "Ready when you are. Pick a timer and let's focus.";

  // Determine which preset is selected based on totalTime
  const selectedPresetIndex = TIMER_PRESETS.findIndex(p => p.minutes * 60 === totalTime);
  const selectedPreset = selectedPresetIndex >= 0 ? selectedPresetIndex : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 uppercase tracking-tight">Focus Timer</h1>
          <p className="text-surface-500 mt-1 text-sm">Deep work sessions with your AI Co-Pilot, Ollie.</p>
        </div>
        {activeTask && (
          <button 
            onClick={() => router.push('/dashboard/tasks')}
            className="text-sm font-semibold text-brand-600 hover:text-brand-500"
          >
            ← Back to Tasks
          </button>
        )}
      </div>

      <div className="bg-surface-50 border-2 border-surface-900 rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center shadow-[8px_8px_0_0_var(--shadow-color)]">
        <OllieAvatar mood={ollieMood} size="xl" />
        <p className="mt-4 text-surface-600 text-sm max-w-sm">{ollieMessage}</p>

        {/* Active Task Pill */}
        {activeTask && (
          <div className="mt-6 flex items-center gap-2 max-w-full">
            <span className="text-xs font-black text-surface-400 uppercase">Focusing on:</span>
            <span className="text-sm font-black text-surface-900 truncate max-w-[200px] uppercase">{activeTask.title}</span>
            <button 
              onClick={handleClearTask}
              className="text-surface-400 hover:text-red-500 p-1 rounded-full transition-colors"
              title="Clear task"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Timer preset pills */}
        <div className="flex flex-wrap gap-2 mt-8 justify-center">
          {TIMER_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              onClick={() => selectPreset(i)}
              disabled={timerState !== 'idle'}
              className={`px-4 py-1.5 border-2 border-surface-900 rounded-lg text-sm font-black uppercase transition-all ${
                selectedPreset === i
                  ? 'bg-surface-900 text-surface-50'
                  : 'bg-surface-100 text-surface-900 hover:bg-surface-200 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Circular progress ring */}
        <div className="relative mt-8">
          <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
            <circle
              cx="100" cy="100" r="90"
              fill="none" stroke="currentColor"
              className="text-surface-200"
              strokeWidth="6"
            />
            <circle
              cx="100" cy="100" r="90"
              fill="none" stroke="currentColor"
              className="text-accent-500 transition-all duration-1000"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
            />
          </svg>
          <div className="absolute inset-0 aspect-square flex items-center justify-center bg-surface-100 border-8 border-surface-900 shadow-[20px_20px_0_0_var(--shadow-color)] rounded-full">
            <div className="text-center">
              <div className="text-5xl font-black text-surface-900 tabular-nums tracking-wider">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <p className="mt-1 text-surface-500 text-xs">{TIMER_PRESETS[selectedPreset]?.label || 'Custom'}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center gap-3">
          {timerState === 'running' ? (
            <button
              onClick={handlePause}
              className="px-8 py-3 border-2 border-surface-900 bg-amber-500 hover:bg-amber-400 text-surface-900 font-black uppercase shadow-[4px_4px_0px_0px_var(--shadow-color)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="mt-6 px-6 py-3 border-2 border-surface-900 bg-accent-600 hover:bg-accent-500 text-surface-100 font-black uppercase shadow-[4px_4px_0px_0px_var(--shadow-color)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              {timerState === 'paused' ? 'Resume' : timeLeft === 0 ? 'Start Again' : 'Start Focus'}
            </button>
          )}
          {timerState !== 'idle' && (
            <button
              onClick={handleReset}
              className="p-3 bg-surface-700 hover:bg-surface-600 text-slate-400 hover:text-white rounded-xl transition-colors"
              aria-label="Reset timer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          )}
        </div>

        {sessionsCompleted > 0 && (
          <p className="mt-6 text-sm text-brand-400">
            🎉 {sessionsCompleted} session{sessionsCompleted > 1 ? 's' : ''} completed today!
          </p>
        )}
      </div>
    </div>
  );
}

