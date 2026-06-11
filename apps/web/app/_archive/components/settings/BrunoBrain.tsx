'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Trash2, 
  RefreshCw, 
  Info, 
  ShieldAlert, 
  Check, 
  X,
  Target,
  Clock,
  Sparkles,
  Megaphone
} from 'lucide-react';
import { toast } from 'sonner';
import BrunoAvatar from '../bruno/BrunoAvatar';
import type { UserAiMemory } from '@/lib/ai/memory';

/**
 * BrunoBrain
 * 
 * A premium settings module for managing Bruno's personalization engine.
 * Allows users to view learned rules, delete patterns, and adjust stable preferences.
 */
export default function BrunoBrain() {
  const [memory, setMemory] = useState<UserAiMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    fetchMemory();
  }, []);

  async function fetchMemory() {
    try {
      const res = await fetch('/api/ai/memory');
      const data = await res.json();
      if (data.memory) setMemory(data.memory);
    } catch (err) {
      toast.error('Failed to load Bruno\'s memory');
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference(field: string, value: any) {
    if (!memory) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ai/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.memory) {
        setMemory(data.memory);
        toast.success('Preference updated');
      }
    } catch (err) {
      toast.error('Failed to update preference');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(id: string) {
    try {
      const res = await fetch(`/api/ai/memory/rules?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.memory) {
        setMemory(data.memory);
        toast.success('Rule forgotten');
      }
    } catch (err) {
      toast.error('Failed to delete rule');
    }
  }

  async function deletePattern(label: string, feature: string) {
    try {
      const res = await fetch(`/api/ai/memory/patterns?label=${encodeURIComponent(label)}&feature=${encodeURIComponent(feature)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.memory) {
        setMemory(data.memory);
        toast.success('Pattern cleared');
      }
    } catch (err) {
      toast.error('Failed to delete pattern');
    }
  }

  async function resetBrain() {
    setSaving(true);
    try {
      const res = await fetch('/api/ai/memory', { method: 'DELETE' });
      const data = await res.json();
      if (data.memory) {
        setMemory(data.memory);
        setResetConfirm(false);
        toast.success('Bruno\'s learned memory has been reset');
      }
    } catch (err) {
      toast.error('Reset failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-surface-900 border-dashed rounded-3xl">
        <RefreshCw className="w-8 h-8 text-accent-500 animate-spin" />
        <span className="text-xs font-black uppercase tracking-widest text-muted">Accessing Bruno's Brain...</span>
      </div>
    );
  }

  if (!memory) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Stable Preferences */}
        <div className="lg:col-span-1 space-y-6">
          <section className="glass p-6 border-2 border-surface-900 shadow-[4px_4px_0_0_var(--surface-900)] bg-white">
            <div className="flex items-center gap-3 mb-6 border-b-2 border-surface-900 pb-3">
              <Sparkles className="w-5 h-5 text-accent-500" />
              <h3 className="font-black uppercase tracking-tight text-sm">Bruno's Voice</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">AI Persona Tone</label>
                <div className="grid grid-cols-1 gap-2">
                  {['warm', 'direct', 'coach'].map((style) => (
                    <button
                      key={style}
                      onClick={() => updatePreference('tone_preference', { ...memory.tone_preference, style })}
                      className={`p-3 text-left border-2 rounded-xl text-xs font-bold uppercase transition-all ${
                        memory.tone_preference.style === style 
                          ? 'border-accent-500 bg-accent-50 text-accent-700 shadow-none translate-x-0.5 translate-y-0.5' 
                          : 'border-surface-900 hover:bg-surface-50 shadow-[3px_3px_0_0_#22201e]'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">Emoji Usage</label>
                <div className="grid grid-cols-3 gap-2">
                  {['none', 'low', 'medium'].map((level) => (
                    <button
                      key={level}
                      onClick={() => updatePreference('tone_preference', { ...memory.tone_preference, emoji_level: level })}
                      className={`p-2 text-center border-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                        memory.tone_preference.emoji_level === level 
                          ? 'border-accent-500 bg-accent-50 text-accent-700' 
                          : 'border-surface-900 hover:bg-surface-50 shadow-[2px_2px_0_0_#22201e]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="glass p-6 border-2 border-surface-900 shadow-[4px_4px_0_0_var(--surface-900)] bg-white">
            <div className="flex items-center gap-3 mb-6 border-b-2 border-surface-900 pb-3">
              <Target className="w-5 h-5 text-accent-500" />
              <h3 className="font-black uppercase tracking-tight text-sm">Planning DNA</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">Strictness Mode</label>
                <div className="grid grid-cols-1 gap-2">
                  {['flexible', 'balanced', 'strict'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updatePreference('planning_style', { ...memory.planning_style, mode })}
                      className={`p-3 text-left border-2 rounded-xl text-xs font-bold uppercase transition-all ${
                        memory.planning_style.mode === mode 
                          ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-none translate-x-0.5 translate-y-0.5' 
                          : 'border-surface-900 hover:bg-surface-50 shadow-[3px_3px_0_0_#22201e]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Col: Learned Memory */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Learned Rules */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-brand-600" />
                <h3 className="font-black uppercase tracking-tighter text-xl">What Bruno Has Picked Up</h3>
              </div>
              <div className="bg-brand-100 text-brand-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {memory.learned_rules.length} Rules Learned
              </div>
            </div>

            {memory.learned_rules.length === 0 ? (
              <div className="p-12 border-2 border-dashed border-surface-200 rounded-3xl text-center">
                <BrunoAvatar mood="thinking" size="sm" />
                <p className="mt-4 text-xs font-bold text-muted uppercase tracking-widest italic">
                  Bruno is still observing your workflow.
                </p>
                <p className="text-[10px] text-muted mt-1 max-w-xs mx-auto uppercase">
                  Use the feedback buttons on schedule blocks to help him learn faster.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {memory.learned_rules.map((rule) => (
                    <motion.div
                      key={rule.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="group p-5 border-2 border-surface-900 bg-white rounded-2xl shadow-[4px_4px_0_0_#22201e] hover:shadow-[6px_6px_0_0_#22201e] transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => deleteRule(rule.id)}
                          className="p-2 hover:bg-error/10 text-muted hover:text-error rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted">Learned Rule</span>
                      </div>
                      <p className="text-sm font-bold text-foreground leading-snug pr-6">{rule.text}</p>
                      <div className="mt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                               <div className="h-full bg-brand-500" style={{ width: `${rule.confidence * 100}%` }} />
                            </div>
                            <span className="text-[9px] font-black uppercase text-muted">{(rule.confidence * 100).toFixed(0)}% Confidence</span>
                         </div>
                         <span className="text-[9px] font-black uppercase text-muted italic">×{rule.evidence_count} spotted</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Disliked Patterns */}
          {memory.disliked_patterns.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Megaphone className="w-5 h-5 text-accent-500" />
                <h3 className="font-black uppercase tracking-tighter text-xl">Avoided Patterns</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {memory.disliked_patterns.map((pattern, idx) => (
                  <button
                    key={`${pattern.feature}-${pattern.label}`}
                    onClick={() => deletePattern(pattern.label, pattern.feature)}
                    className="group flex items-center gap-2 px-4 py-2 border-2 border-surface-900 bg-white rounded-xl shadow-[3px_3px_0_0_#22201e] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                  >
                    <span className="text-xs font-bold uppercase tracking-tight">{pattern.label}</span>
                    <X className="w-3 h-3 text-muted group-hover:text-error transition-colors" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Danger Zone: Reset Brain */}
          <section className="mt-12 pt-12 border-t-2 border-surface-100">
            <div className="flex items-start gap-4 p-6 border-2 border-error/20 bg-error/5 rounded-3xl">
              <div className="p-3 bg-white border-2 border-error rounded-2xl">
                <ShieldAlert className="w-6 h-6 text-error" />
              </div>
              <div className="flex-1">
                <h4 className="font-black uppercase tracking-tight text-error">AI Brain Reset</h4>
                <p className="text-xs text-surface-500 font-bold uppercase mt-1 leading-relaxed">
                  Permanently wipe everything Bruno has learned about your workflow. 
                  This will clear all rules, patterns, and counters. Your manual settings will be preserved.
                </p>
                <div className="mt-4">
                  {!resetConfirm ? (
                    <button
                      onClick={() => setResetConfirm(true)}
                      className="px-6 py-2 bg-white border-2 border-error text-error text-[10px] font-black uppercase tracking-widest hover:bg-error hover:text-white transition-all shadow-[4px_4px_0_0_#ef4444]"
                    >
                      Reset Bruno's Brain
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 animate-in fade-in zoom-in-95">
                      <button
                        onClick={resetBrain}
                        disabled={saving}
                        className="px-6 py-2 bg-error text-white text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_#991b1b] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                      >
                        {saving ? 'Resetting...' : 'Confirm Reset'}
                      </button>
                      <button
                        onClick={() => setResetConfirm(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
