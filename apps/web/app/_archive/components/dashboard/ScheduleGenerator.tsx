'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFocusStore } from '@/store/useFocusStore';
import BrunoAvatar from '../bruno/BrunoAvatar';
import type { Task } from '@/types/database';

interface ScheduleItem {
  id: string;
  title: string;
  reason: string;
  duration?: number;
}

interface ScheduleData {
  plan: ScheduleItem[];
  message: string;
  schedule_name: string;
  vibe: string;
  focus_score: number;
}

export default function ScheduleGenerator() {
  const [energy, setEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<ScheduleData | null>(null);
  const [feedbackLogged, setFeedbackLogged] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const router = useRouter();
  const setActiveTask = useFocusStore((state) => state.setActiveTask);

  const logFeedback = useCallback(async (action: 'accept' | 'reject', correction?: string) => {
    if (!plan || feedbackLogged) return;
    
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'schedule_generator',
          suggestion_json: plan,
          action,
          correction_text: correction,
        }),
      });
      setFeedbackLogged(true);
    } catch (err) {
      console.error('Failed to log feedback:', err);
    }
  }, [plan, feedbackLogged]);

  async function generatePlan() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energyLevel: energy }),
      });

      if (res.status === 403) {
        setShowPaywall(true);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlan(data);
      setFeedbackLogged(false);
    } catch (err) {
      console.error(err);
      const useFallback = confirm('Bruno is having trouble connecting. Use a default backup plan instead?');
      if (useFallback) {
        setPlan({
          schedule_name: "Personal Daily Plan",
          message: "Bruno is taking a short break, but your goals remain. I've loaded a balanced fallback plan for you.",
          vibe: "Steady Progress",
          focus_score: 85,
          plan: [
            { id: 'fallback-1', title: 'High Priority Task', reason: 'Focus on your most important task while your energy is fresh.' },
            { id: 'fallback-2', title: 'Restorative Break', reason: 'A short break to clear your mind and reset.' },
            { id: 'fallback-3', title: 'Quick Wins', reason: 'Complete smaller tasks to maintain momentum.' }
          ]
        });
        setFeedbackLogged(false);
      }
    } finally {
      setLoading(false);
    }
  }

  function startTask(item: ScheduleItem) {
    logFeedback('accept');
    const task: Partial<Task> = {
      id: item.id,
      title: item.title,
      completed: false,
    };
    setActiveTask(task as Task);
    router.push('/dashboard/focus');
  }

  return (
    <div className={`glass border-2 border-surface-900 transition-all duration-500 ${plan ? 'bg-surface-100 shadow-[12px_12px_0_0_#ff6b00]' : 'bg-surface-100 shadow-[8px_8px_0_0_#22201e]'}`}>
      <div className="p-6">
        <h2 className="text-xl font-black uppercase tracking-tighter text-surface-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-2xl">✨</span> Daily Planner
          </span>
          {plan && (
            <span className="text-[10px] bg-accent-500 text-surface-900 px-2 py-0.5 rounded-none border border-surface-900 animate-pulse">
              Current Schedule
            </span>
          )}
        </h2>
        
        {!plan ? (
          <div className="space-y-6">
            <p className="text-sm text-surface-600 font-bold uppercase tracking-tight">Status: Ready to Plan</p>
            
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => setEnergy(e)}
                  className={`py-4 border-2 border-surface-900 flex flex-col items-center gap-1 transition-all ${
                    energy === e 
                      ? 'bg-accent-500 text-surface-900 shadow-none translate-x-1 translate-y-1' 
                      : 'bg-surface-100 text-surface-900 shadow-[4px_4px_0_0_#22201e] hover:-translate-y-0.5'
                  }`}
                >
                  <span className="text-xl">
                    {e === 'low' && '🐌'}
                    {e === 'medium' && '🏃'}
                    {e === 'high' && '⚡'}
                  </span>
                  <span className="text-[10px] font-black uppercase">{e}</span>
                </button>
              ))}
            </div>

            <button
              onClick={generatePlan}
              disabled={loading}
              className="w-full py-5 bg-surface-900 text-surface-100 font-black uppercase tracking-widest text-sm border-2 border-surface-900 hover:bg-surface-800 transition-all shadow-[6px_6px_0_0_#ff6b00] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex flex-col items-center gap-1">
                  <span className="animate-pulse">Analyzing Calendar...</span>
                  <div className="w-48 h-1 bg-surface-700 mt-2 overflow-hidden">
                    <div className="h-full bg-accent-500 animate-slide-infinite" style={{ width: '40%' }} />
                  </div>
                </span>
              ) : 'Generate Daily Plan'}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Daily Plan Header */}
            <div className="bg-surface-900 text-surface-100 p-4 border-2 border-surface-900 shadow-[4px_4px_0_0_#ff6b00] -mx-2">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent-500">Energy Profile</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">Score: {plan.focus_score}%</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">{plan.schedule_name}</h3>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest italic">{plan.vibe}</p>
            </div>

            {/* Bruno's Message */}
            <div className="flex items-start gap-4 p-4 border-2 border-surface-900 bg-white italic relative overflow-hidden">
               <div className="shrink-0 relative z-10">
                 <BrunoAvatar mood="happy" size="sm" />
               </div>
               <p className="text-sm font-bold text-surface-900 leading-snug relative z-10 pr-8">
                 &quot;{plan.message}&quot;
               </p>
               <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none transform -rotate-12">
                 <BrunoAvatar mood="happy" size="xl" />
               </div>
            </div>

            {/* Planned Steps */}
            <div className="space-y-3">
              {plan.plan?.map((item: ScheduleItem, index: number) => (
                <div 
                  key={item.id} 
                  className="p-4 border-2 border-surface-900 bg-white hover:bg-surface-50 transition-all shadow-[4px_4px_0_0_#22201e] hover:shadow-[6px_6px_0_0_#ff6b00] group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-accent-600 uppercase">Step 0{index + 1}</span>
                        <div className="h-[2px] flex-1 bg-surface-200" />
                      </div>
                      <h4 className="font-black text-base uppercase text-surface-900 truncate pr-4">{item.title}</h4>
                      <p className="text-xs text-surface-600 font-medium leading-relaxed mt-1 line-clamp-2">{item.reason}</p>
                    </div>
                    <button 
                      onClick={() => startTask(item)}
                      className="shrink-0 w-12 h-12 bg-surface-900 text-surface-100 flex items-center justify-center border-2 border-surface-900 hover:bg-accent-500 hover:text-surface-900 transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      <span className="text-xl font-bold">→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t-2 border-surface-200">
              <button
                onClick={() => {
                  logFeedback('reject');
                  setPlan(null);
                }}
                className="flex-1 py-2 text-[10px] font-black uppercase text-surface-400 hover:text-error transition-all tracking-widest"
              >
                Reset Schedule
              </button>
              {!feedbackLogged && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => logFeedback('accept')}
                    className="p-2 border-2 border-surface-900 bg-white hover:bg-success-50 text-success-600 transition-all shadow-[2px_2px_0_0_#22201e] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                    title="Good plan"
                  >
                    👍
                  </button>
                  <button 
                    onClick={() => {
                      const msg = prompt("What's wrong with this plan? (Optional)");
                      logFeedback('reject', msg || undefined);
                      setPlan(null);
                    }}
                    className="p-2 border-2 border-surface-900 bg-white hover:bg-error-50 text-error-600 transition-all shadow-[2px_2px_0_0_#22201e] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                    title="Bad plan"
                  >
                    👎
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Paywall Overlay */}
      {showPaywall && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-surface-900/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border-4 border-surface-900 p-6 shadow-[8px_8px_0px_0px_#ff6b00] text-center max-w-sm">
            <div className="text-4xl mb-4 animate-bounce">💎</div>
            <h4 className="text-lg font-black uppercase tracking-widest text-surface-900 mb-2">Daily Limit Reached</h4>
            <p className="text-xs font-bold text-surface-500 uppercase leading-relaxed mb-6">
              Your schedule is at capacity. Upgrade to Pro for unlimited daily schedules and full priority planning support.
            </p>
            <div className="flex flex-col gap-3">
              <Link 
                href="/pricing"
                className="bg-accent-500 text-surface-900 py-4 px-6 text-xs font-black uppercase tracking-widest hover:bg-accent-400 transition-all shadow-[4px_4px_0px_0px_#22201e] active:translate-x-0.5 active:translate-y-0.5 text-center"
              >
                Upgrade to Pro
              </Link>
              <button 
                onClick={() => setShowPaywall(false)}
                className="text-[10px] font-black uppercase tracking-widest text-surface-400 hover:text-surface-900 transition-colors py-2"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
