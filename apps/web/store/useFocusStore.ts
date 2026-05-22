import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from '@/types/tasks';

export type TimerState = 'idle' | 'running' | 'paused';

interface FocusState {
  // Task State
  activeTask: Task | null;
  
  // Timer State
  timeLeft: number;
  totalTime: number;
  timerState: TimerState;
  sessionsCompleted: number;
  
  // Actions
  setActiveTask: (task: Task | null) => void;
  startTimer: (minutes?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  setTimerPreset: (minutes: number) => void;
  tick: () => void;
  completeSession: () => void;
  
  // Nudge State (for AI/Bruno)
  lastNudgeTime: number | null;
  currentNudge: string | null;
  setLastNudgeTime: (time: number) => void;
  setNudge: (nudge: string | null) => void;
  
  // Audio State
  selectedSound: string;
  volume: number;
  setSelectedSound: (id: string) => void;
  setVolume: (volume: number) => void;
}

const DEFAULT_MINUTES = 25;

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      activeTask: null,
      timeLeft: DEFAULT_MINUTES * 60,
      totalTime: DEFAULT_MINUTES * 60,
      timerState: 'idle',
      sessionsCompleted: 0,
      lastNudgeTime: null,
      currentNudge: null,
      selectedSound: 'none',
      volume: 0.5,

      setActiveTask: (task) => set({ activeTask: task }),
      
      startTimer: (minutes) => {
        const timeToSet = minutes ? minutes * 60 : get().timeLeft || DEFAULT_MINUTES * 60;
        set({ 
          timeLeft: timeToSet, 
          totalTime: minutes ? minutes * 60 : get().totalTime || DEFAULT_MINUTES * 60,
          timerState: 'running' 
        });
      },
      
      pauseTimer: () => set({ timerState: 'paused' }),
      
      resumeTimer: () => set({ timerState: 'running' }),
      
      resetTimer: () => set({ 
        timerState: 'idle', 
        timeLeft: get().totalTime,
        lastNudgeTime: null,
        currentNudge: null
      }),
      
      setTimerPreset: (minutes) => set({
        timeLeft: minutes * 60,
        totalTime: minutes * 60,
        timerState: 'idle'
      }),
      
      tick: () => set((state) => {
        if (state.timerState !== 'running' || state.timeLeft <= 0) return state;
        return { timeLeft: state.timeLeft - 1 };
      }),
      
      completeSession: () => set((state) => ({
        timerState: 'idle',
        timeLeft: 0,
        sessionsCompleted: state.sessionsCompleted + 1,
        lastNudgeTime: null,
        currentNudge: null
      })),
      
      setLastNudgeTime: (time) => set({ lastNudgeTime: time }),
      setNudge: (nudge) => set({ currentNudge: nudge }),
      setSelectedSound: (id) => set({ selectedSound: id }),
      setVolume: (v) => set({ volume: v }),
    }),
    {
      name: 'planevo-focus-storage',
      // Only persist certain fields to avoid weird timer jumps if they refresh while running
      partialize: (state) => ({ 
        activeTask: state.activeTask,
        sessionsCompleted: state.sessionsCompleted,
        // We persist timeLeft so if they accidentally refresh, they don't lose their pomodoro
        timeLeft: state.timeLeft,
        totalTime: state.totalTime,
        timerState: state.timerState === 'running' ? 'paused' : state.timerState, // Pause on reload
        selectedSound: state.selectedSound,
        volume: state.volume
      }),
    }
  )
);
