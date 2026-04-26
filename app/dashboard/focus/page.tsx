'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import OllieAvatar from '@/components/ollie/OllieAvatar';

type TimerState = 'idle' | 'running' | 'paused';

const TIMER_PRESETS = [
  { label: 'Pomodoro', minutes: 25 },
  { label: 'Short Break', minutes: 5 },
  { label: 'Long Break', minutes: 15 },
  { label: 'Deep Work', minutes: 50 },
];

export default function FocusPage() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_PRESETS[0].minutes * 60);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearTimer();
            setTimerState('idle');
            setSessionsCompleted((s) => s + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTimer;
  }, [timerState, clearTimer]);

  function handleStart() {
    if (timeLeft === 0) {
      setTimeLeft(TIMER_PRESETS[selectedPreset].minutes * 60);
    }
    setTimerState('running');
  }

  function handlePause() {
    clearTimer();
    setTimerState('paused');
  }

  function handleReset() {
    clearTimer();
    setTimerState('idle');
    setTimeLeft(TIMER_PRESETS[selectedPreset].minutes * 60);
  }

  function selectPreset(index: number) {
    if (timerState !== 'idle') return;
    setSelectedPreset(index);
    setTimeLeft(TIMER_PRESETS[index].minutes * 60);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = TIMER_PRESETS[selectedPreset].minutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

  const ollieMood = timerState === 'running' ? 'thinking' as const
    : timeLeft === 0 ? 'celebrating' as const
    : 'gentle' as const;

  const ollieMessage = timerState === 'running'
    ? "You're doing great. Stay with it."
    : timeLeft === 0
    ? "Session complete! Nice work. Take a breather."
    : timerState === 'paused'
    ? "Paused. Take your time, I'll be here."
    : "Ready when you are. Pick a timer and let's focus.";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Focus Timer</h1>
        <p className="text-slate-400 mt-1 text-sm">Deep work sessions with Ollie by your side.</p>
      </div>

      <div className="glass rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center">
        <OllieAvatar mood={ollieMood} size="xl" />
        <p className="mt-4 text-slate-400 text-sm max-w-xs">{ollieMessage}</p>

        {/* Timer preset pills */}
        <div className="flex flex-wrap gap-2 mt-8 justify-center">
          {TIMER_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              onClick={() => selectPreset(i)}
              disabled={timerState !== 'idle'}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedPreset === i
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed'
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
              className="text-surface-700"
              strokeWidth="6"
            />
            <circle
              cx="100" cy="100" r="90"
              fill="none" stroke="currentColor"
              className="text-brand-500 transition-all duration-1000"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-white tabular-nums tracking-wider">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <p className="mt-1 text-slate-500 text-xs">{TIMER_PRESETS[selectedPreset].label}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center gap-3">
          {timerState === 'running' ? (
            <button
              onClick={handlePause}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
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
