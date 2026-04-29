'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFocusStore } from '@/store/useFocusStore';
import OllieAvatar from '../ollie/OllieAvatar';
import type { Task } from '@/types/database';

export default function FlightPlan() {
  const [energy, setEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<{ 
    plan: any[], 
    message: string, 
    mission_name: string, 
    vibe: string, 
    focus_score: number 
  } | null>(null);
  const router = useRouter();
  const setActiveTask = useFocusStore((state) => state.setActiveTask);

  async function generatePlan() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/flight-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energyLevel: energy }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlan(data);
    } catch (err) {
      console.error(err);
      alert('Ollie is having trouble connecting to the flight deck. Try again?');
    } finally {
      setLoading(false);
    }
  }

  function startTask(task: any) {
    setActiveTask(task as Task);
    router.push('/dashboard/focus');
  }

  return (
    <div className={`glass border-2 border-surface-900 transition-all duration-500 ${plan ? 'bg-surface-100 shadow-[12px_12px_0_0_#ff6b00]' : 'bg-surface-100 shadow-[8px_8px_0_0_#22201e]'}`}>
      <div className="p-6">
        <h2 className="text-xl font-black uppercase tracking-tighter text-surface-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-2xl">🚀</span> Flight Deck
          </span>
          {plan && (
            <span className="text-[10px] bg-accent-500 text-surface-900 px-2 py-0.5 rounded-none border border-surface-900 animate-pulse">
              Active Briefing
            </span>
          )}
        </h2>
        
        {!plan ? (
          <div className="space-y-6">
            <p className="text-sm text-surface-600 font-bold uppercase tracking-tight">Status: Waiting for Pilot Input</p>
            
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
                  <span className="animate-pulse">Analyzing Biometrics...</span>
                  <div className="w-48 h-1 bg-surface-700 mt-2 overflow-hidden">
                    <div className="h-full bg-accent-500 animate-slide-infinite" style={{ width: '40%' }} />
                  </div>
                </span>
              ) : 'Assemble Flight Plan'}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Mission Header */}
            <div className="bg-surface-900 text-surface-100 p-4 border-2 border-surface-900 shadow-[4px_4px_0_0_#ff6b00] -mx-2">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent-500">Mission Profile</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-surface-400">Score: {plan.focus_score}%</span>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">{plan.mission_name}</h3>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest italic">{plan.vibe}</p>
            </div>

            {/* Ollie's Message */}
            <div className="flex items-start gap-4 p-4 border-2 border-surface-900 bg-white italic relative overflow-hidden">
               <div className="shrink-0 relative z-10">
                 <OllieAvatar mood="happy" size="sm" />
               </div>
               <p className="text-sm font-bold text-surface-900 leading-snug relative z-10 pr-8">
                 &quot;{plan.message}&quot;
               </p>
               <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none transform -rotate-12">
                 <OllieAvatar mood="happy" size="xl" />
               </div>
            </div>

            {/* Tactical Steps */}
            <div className="space-y-3">
              {plan.plan?.map((item: any, index: number) => (
                <div 
                  key={item.id} 
                  className="p-4 border-2 border-surface-900 bg-white hover:bg-surface-50 transition-all shadow-[4px_4px_0_0_#22201e] hover:shadow-[6px_6px_0_0_#ff6b00] group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-accent-600 uppercase">Stage 0{index + 1}</span>
                        <div className="h-[2px] flex-1 bg-surface-200" />
                      </div>
                      <h4 className="font-black text-base uppercase text-surface-900 truncate pr-4">{item.title}</h4>
                      <p className="text-xs text-surface-600 font-medium leading-relaxed mt-1 line-clamp-2">{item.reason}</p>
                    </div>
                    <button 
                      onClick={() => startTask({ id: item.id, title: item.title })}
                      className="shrink-0 w-12 h-12 bg-surface-900 text-surface-100 flex items-center justify-center border-2 border-surface-900 hover:bg-accent-500 hover:text-surface-900 transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      <span className="text-xl font-bold">→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setPlan(null)}
              className="w-full py-2 text-[10px] font-black uppercase text-surface-400 hover:text-surface-900 transition-all tracking-widest border-t-2 border-surface-200 mt-4"
            >
              Abort Mission & Recalculate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
