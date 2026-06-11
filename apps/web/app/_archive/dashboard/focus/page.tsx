'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrunoAvatar from '@/components/bruno/BrunoAvatar';
import { useFocusStore } from '@/store/useFocusStore';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FOCUS_SOUNDS } from '@/lib/audio/sounds';
import FocusAudioPlayer from '@/components/focus/FocusAudioPlayer';
import SessionCompleteModal from '@/components/focus/SessionCompleteModal';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, Sparkles, Brain, Timer } from 'lucide-react';

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
    setTimerPreset,
    tick,
    completeSession,
    currentNudge,
    setNudge,
    lastNudgeTime,
    setLastNudgeTime,
    selectedSound,
    setSelectedSound,
    volume,
    setVolume
  } = useFocusStore();

  // Tick the timer globally
  useEffect(() => {
    if (timerState === 'running') {
      const interval = setInterval(async () => {
        if (timeLeft <= 1) {
          completeSession();
          // Log to database
          const { data: { user } } = await createClient().auth.getUser();
          if (user) {
            await createClient().from('focus_sessions').insert({
              user_id: user.id,
              duration_minutes: Math.ceil(totalTime / 60),
              was_interrupted: false
            });
          }
        } else {
          tick();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerState, timeLeft, tick, completeSession, totalTime]);

  // AI NUDGE LOGIC
  const triggerNudge = useCallback(async (isReturning = false) => {
    try {
      const res = await fetch('/api/ai/nudge', {
        method: 'POST',
        body: JSON.stringify({
          taskTitle: activeTask?.title,
          timeLeft,
          totalTime,
          isReturning
        })
      });
      const data = await res.json();
      if (data.nudge) {
        setNudge(data.nudge);
        setLastNudgeTime(Date.now());
        // Clear nudge after 8 seconds
        setTimeout(() => setNudge(null), 8000);
      }
    } catch (err) {
      console.error('Nudge trigger failed:', err);
    }
  }, [activeTask, timeLeft, totalTime, setNudge, setLastNudgeTime]);

  // Trigger periodic nudges (every 10 minutes)
  useEffect(() => {
    if (timerState === 'running') {
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      if (!lastNudgeTime || (now - lastNudgeTime > tenMinutes)) {
        if (!lastNudgeTime) {
           setLastNudgeTime(now - (5 * 60 * 1000));
        } else {
           triggerNudge();
        }
      }
    }
  }, [timerState, lastNudgeTime, triggerNudge, setLastNudgeTime]);

  // Trigger nudge when returning to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerState === 'running') {
        const twoMinutes = 2 * 60 * 1000;
        if (!lastNudgeTime || (Date.now() - lastNudgeTime > twoMinutes)) {
          triggerNudge(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState, lastNudgeTime, triggerNudge]);

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
    setTimerPreset(minutes);
  }

  function handleClearTask() {
    setActiveTask(null);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  const brunoMood = timerState === 'running' ? 'thinking' as const
    : timeLeft === 0 && sessionsCompleted > 0 ? 'celebrating' as const
    : 'gentle' as const;

  const brunoMessage = currentNudge 
    ? currentNudge
    : timerState === 'running' && activeTask
    ? `Focusing on: "${activeTask.title}". Deep work mode active.`
    : timerState === 'running'
    ? "You're doing great. Sustain this rhythm."
    : timeLeft === 0 && sessionsCompleted > 0
    ? "Session complete! Time for a restorative break."
    : timerState === 'paused'
    ? "Paused. Take a deep breath."
    : activeTask 
    ? `Ready to dedicate focus to "${activeTask.title}"?`
    : "Pick a session type and let's get into flow state.";

  const selectedPresetIndex = TIMER_PRESETS.findIndex(p => p.minutes * 60 === totalTime);
  const selectedPreset = selectedPresetIndex >= 0 ? selectedPresetIndex : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <FocusAudioPlayer />
      <SessionCompleteModal />
      
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-surface-900 uppercase tracking-tighter leading-none mb-1 flex items-center gap-2">
            Focus Assistant
            <span className="text-brand-500 px-2 py-0.5 bg-brand-50 rounded text-xs">Beta</span>
          </h1>
          <p className="text-surface-500 text-sm font-bold uppercase tracking-widest">
            Deep Work & Flow State Optimization
          </p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/daily-plan')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-surface-500 hover:text-surface-900 transition-all hover:bg-surface-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Plan
        </button>
      </div>

      {/* Main Focus Container */}
      <div className="relative group">
        {/* Decorative elements */}
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-accent-500 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-white/80 backdrop-blur-xl border-4 border-surface-900 rounded-[3rem] p-8 md:p-16 flex flex-col items-center justify-center text-center shadow-[20px_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
          
          {/* Animated Background Flow */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(var(--brand-rgb),0.1),transparent_50%)]" />
          </div>

          <div className="relative z-10 w-full flex flex-col items-center">
            <motion.div
              animate={{ 
                scale: timerState === 'running' ? [1, 1.05, 1] : 1,
                rotate: timerState === 'running' ? [0, 1, -1, 0] : 0
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <BrunoAvatar mood={brunoMood} size="xl" />
            </motion.div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={brunoMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 min-h-[3rem]"
              >
                <p className="text-surface-600 text-lg font-bold tracking-tight max-w-lg leading-snug">
                  {brunoMessage}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Active Task Pill */}
            <AnimatePresence>
              {activeTask && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-8 flex items-center gap-3 px-6 py-3 bg-brand-50 border-2 border-brand-200 rounded-2xl shadow-sm group/task"
                >
                  <Brain className="w-4 h-4 text-brand-600" />
                  <span className="text-sm font-black text-brand-900 uppercase tracking-tight truncate max-w-[300px]">
                    {activeTask.title}
                  </span>
                  <button 
                    onClick={handleClearTask}
                    className="text-brand-300 hover:text-red-500 p-1 rounded-full transition-colors"
                    title="Change Task"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer Presets */}
            <div className="flex flex-wrap gap-3 mt-10 justify-center">
              {TIMER_PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  onClick={() => selectPreset(i)}
                  disabled={timerState !== 'idle'}
                  aria-pressed={selectedPreset === i}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${
                    selectedPreset === i && timerState !== 'idle'
                      ? 'bg-surface-900 text-white border-surface-900 shadow-lg'
                      : selectedPreset === i
                      ? 'bg-surface-900 text-white border-surface-900 shadow-md'
                      : 'bg-white text-surface-500 border-surface-100 hover:border-surface-300 hover:bg-surface-50 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Main Timer Display */}
            <div className="relative mt-12 mb-4 group/timer">
              <div className="absolute inset-0 bg-accent-500/10 blur-[50px] rounded-full scale-150 animate-pulse-slow pointer-events-none" />
              
              <svg width="320" height="320" viewBox="0 0 200 200" className="transform -rotate-90 drop-shadow-2xl">
                <circle
                  cx="100" cy="100" r="88"
                  fill="none" stroke="currentColor"
                  className="text-surface-100"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="100" cy="100" r="88"
                  fill="none" stroke="currentColor"
                  className="text-accent-500"
                  strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: progress / 100 }}
                  transition={{ duration: 1, ease: "linear" }}
                  style={{ strokeDasharray: "1 0" }}
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div 
                  className="text-7xl font-black text-surface-900 tabular-nums tracking-tighter leading-none"
                  animate={{ scale: timerState === 'running' ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {String(minutes).padStart(2, '0')}<span className="opacity-30">:</span>{String(seconds).padStart(2, '0')}
                </motion.div>
                <div className="mt-4 flex items-center gap-2 px-4 py-1.5 bg-surface-100 rounded-full">
                  <Timer className="w-3.5 h-3.5 text-surface-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">
                    {TIMER_PRESETS[selectedPreset]?.label || 'Deep Work'} Mode
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-8">
              {timerState !== 'idle' && (
                <button
                  onClick={handleReset}
                  className="p-5 bg-surface-100 hover:bg-surface-200 text-surface-500 hover:text-surface-900 rounded-[2rem] transition-all active:scale-90 border-2 border-transparent hover:border-surface-200"
                  aria-label="Reset timer"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              )}
              
              {timerState === 'running' ? (
                <button
                  onClick={handlePause}
                  className="group relative px-12 py-5 bg-amber-500 hover:bg-amber-400 text-surface-900 font-black uppercase tracking-widest rounded-[2rem] border-4 border-surface-900 shadow-[8px_8px_0_0_var(--shadow-color)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-3 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <Pause className="w-6 h-6 relative z-10" />
                  <span className="text-xl relative z-10">Pause Session</span>
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  className="group relative px-12 py-5 bg-accent-600 hover:bg-accent-500 text-white font-black uppercase tracking-widest rounded-[2rem] border-4 border-surface-900 shadow-[8px_8px_0_0_var(--shadow-color)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-3 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {timerState === 'paused' ? <Play className="w-6 h-6 relative z-10" /> : <Sparkles className="w-6 h-6 relative z-10" />}
                  <span className="text-xl relative z-10">
                    {timerState === 'paused' ? 'Resume' : 'Start Session'}
                  </span>
                </button>
              )}
            </div>

            {sessionsCompleted > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 flex items-center gap-2 px-6 py-2 bg-green-50 text-green-700 rounded-full border border-green-100 font-bold text-xs uppercase tracking-widest"
              >
                <Sparkles className="w-4 h-4" />
                {sessionsCompleted} session{sessionsCompleted > 1 ? 's' : ''} complete today
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Ambient Audio Section */}
      <div className="bg-surface-50 border-4 border-surface-900 rounded-[3rem] p-8 md:p-12 shadow-[10px_10px_0_0_var(--shadow-color)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-surface-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Volume2 className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-surface-900 uppercase tracking-tighter">Ambient Soundscape</h3>
              <p className="text-surface-500 text-[10px] font-black uppercase tracking-widest">Atmospheric audio for sustained focus</p>
            </div>
          </div>
          
          {selectedSound !== 'none' && (
            <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border-2 border-surface-100 shadow-sm min-w-[240px]">
              <label htmlFor="sound-intensity" className="text-[10px] font-black text-surface-400 uppercase tracking-widest shrink-0">Intensity</label>
              <input 
                id="sound-intensity"
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-surface-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
                aria-label="Sound intensity"
              />
              <span className="text-[10px] font-black text-surface-900 w-8" aria-hidden="true">{Math.round(volume * 100)}%</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {FOCUS_SOUNDS.map((sound) => (
            <button
              key={sound.id}
              onClick={() => setSelectedSound(sound.id)}
              className={`flex flex-col items-center gap-3 p-6 border-4 rounded-[2rem] transition-all duration-300 relative group/sound ${
                selectedSound === sound.id
                  ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-xl -translate-y-1'
                  : 'border-surface-100 bg-white text-surface-400 hover:border-surface-300 hover:text-surface-900 hover:-translate-y-1'
              }`}
            >
              <span className={`text-3xl transition-transform duration-500 ${selectedSound === sound.id ? 'scale-125' : 'group-hover/sound:scale-110'}`}>
                {sound.icon}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-center">{sound.name}</span>
              
              {selectedSound === sound.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
