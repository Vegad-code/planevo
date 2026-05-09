'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CheckCircle, CalendarBlank, Target, Sparkle } from '@phosphor-icons/react';
import OllieAvatar from '@/components/ollie/OllieAvatar';

const SIMULATION_STEPS = [
  {
    type: 'prompt',
    text: "I have 3 Canvas assignments due Friday and a workout at 5 PM. I'm feeling overwhelmed.",
    delay: 500
  },
  {
    type: 'agent',
    text: "I've got you. Scanning Canvas and your Calendar...",
    delay: 1500
  },
  {
    type: 'creation',
    items: [
      { id: 1, type: 'canvas', text: 'Math 101: Calculus Quiz', time: 'Friday 11:59 PM', color: 'bg-brand-500' },
      { id: 2, type: 'canvas', text: 'History: Essay Draft', time: 'Friday 5:00 PM', color: 'bg-accent-500' },
      { id: 3, type: 'calendar', text: 'Gym Session', time: 'Today 5:00 PM', color: 'bg-surface-900' }
    ],
    delay: 3000
  },
  {
    type: 'agent',
    text: "Prioritizing your Math Quiz first. Generating your calm plan...",
    delay: 5000
  },
  {
    type: 'result',
    plan: [
      { time: '9:00 AM', task: 'Math Focus Session (90m)', icon: Target },
      { time: '11:00 AM', task: 'History Research (60m)', icon: Sparkle },
      { time: '5:00 PM', task: 'Workout - Clear your head', icon: CheckCircle }
    ],
    delay: 7000
  }
];

export default function PlanSimulation() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < SIMULATION_STEPS.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(s => s + 1);
      }, 3000); // Progress every 3s for demo
      return () => clearTimeout(timer);
    } else {
      // Reset after a long delay to loop
      const timer = setTimeout(() => setCurrentStep(0), 10000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-surface-100 border-4 border-surface-900 shadow-[16px_16px_0px_0px_var(--surface-900)] rounded-[2.5rem] overflow-hidden relative min-h-[500px] flex flex-col">
      {/* Header Bar */}
      <div className="bg-surface-900 p-4 flex items-center gap-2 border-b-4 border-surface-900">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-error" />
          <div className="w-3 h-3 rounded-full bg-warning" />
          <div className="w-3 h-3 rounded-full bg-success" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-400">Ollie Agent — Simulation v1.0</span>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {SIMULATION_STEPS.slice(0, currentStep + 1).map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="w-full"
            >
              {step.type === 'prompt' && (
                <div className="flex justify-end">
                  <div className="bg-brand-100 border-2 border-surface-900 p-4 rounded-2xl rounded-tr-none max-w-[80%]">
                    <p className="text-sm font-bold text-surface-900 italic">"{step.text}"</p>
                  </div>
                </div>
              )}

              {step.type === 'agent' && (
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 flex-shrink-0 bg-brand-500 border-2 border-surface-900 rounded-full flex items-center justify-center text-xl overflow-hidden">
                    <OllieAvatar mood="celebrating" size="sm" />
                  </div>
                  <div className="bg-surface-100 border-2 border-surface-900 p-4 rounded-2xl rounded-tl-none shadow-[4px_4px_0px_0px_var(--surface-900)]">
                    <p className="text-sm font-black text-surface-900 leading-relaxed">{step.text}</p>
                    {idx === 1 && (
                      <div className="mt-3 relative h-1.5 bg-surface-200 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-brand-500"
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2 }}
                        />
                        {/* Laser line effect */}
                        <motion.div 
                          className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/50 to-transparent z-10"
                          initial={{ left: "-20%" }}
                          animate={{ left: "120%" }}
                          transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step.type === 'creation' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-14">
                  {step.items?.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.2 }}
                      className={`${item.color} border-2 border-surface-900 p-3 rounded-xl shadow-[4px_4px_0px_0px_var(--surface-900)]`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <CalendarBlank weight="bold" className="w-4 h-4 text-surface-900" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-surface-900/60">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs font-black text-surface-900 line-clamp-1">{item.text}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {step.type === 'result' && (
                <div className="pl-14 pt-4">
                  <div className="bg-surface-900 text-surface-100 p-6 rounded-3xl border-2 border-surface-900 shadow-[8px_8px_0px_0px_var(--accent-500)]">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkle weight="fill" className="text-accent-500 w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-widest text-accent-500">Optimized Day</span>
                    </div>
                    <div className="space-y-4">
                      {step.plan?.map((item, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.3 }}
                          className="flex items-center gap-4 group"
                        >
                          <span className="text-[10px] font-black font-mono text-surface-400 w-14">
                            {item.time}
                          </span>
                          <div className="w-8 h-8 bg-surface-800 border border-surface-700 rounded-lg flex items-center justify-center text-accent-500 group-hover:bg-accent-500 group-hover:text-surface-900 transition-colors">
                            <item.icon weight="bold" className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-surface-100">
                            {item.task}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-surface-200/50 border-t-2 border-surface-900 flex justify-between items-center px-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-surface-500">Live Engine Active</span>
        </div>
        <div className="flex gap-4">
           <div className="h-1 w-8 bg-surface-900/10 rounded-full" />
           <div className="h-1 w-8 bg-surface-900/10 rounded-full" />
           <div className="h-1 w-8 bg-surface-900/10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
