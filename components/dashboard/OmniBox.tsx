'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Command, Plus, Zap, Clock, Calendar, X, Package } from 'lucide-react';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import { toast } from 'sonner';

export default function OmniBox() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Global keyboard shortcut: Cmd+J / Ctrl+J
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-focus when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || saving) return;

    setSaving(true);
    const raw = input.trim();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in first');
        return;
      }

      // Smart parsing: extract duration hints and due dates
      let title = raw;
      let estimatedMinutes = 30;
      let dueDate: string | null = null;

      // Duration patterns: "30m", "1h", "90min", "2 hours"
      const durMatch = raw.match(/\b(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hours?)\b/i);
      if (durMatch) {
        const num = parseInt(durMatch[1]);
        const unit = durMatch[2].toLowerCase();
        estimatedMinutes = unit.startsWith('h') ? num * 60 : num;
        title = title.replace(durMatch[0], '').trim();
      }

      // "tomorrow" keyword
      if (/\btomorrow\b/i.test(raw)) {
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        dueDate = tmrw.toISOString().split('T')[0];
        title = title.replace(/\btomorrow\b/i, '').trim();
      }

      // "today" keyword
      if (/\btoday\b/i.test(raw)) {
        dueDate = new Date().toISOString().split('T')[0];
        title = title.replace(/\btoday\b/i, '').trim();
      }

      // Clean up stray prepositions
      title = title.replace(/\b(at|by|for|in|on)\s*$/i, '').trim();

      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: title || raw,
          estimated_minutes: estimatedMinutes,
          due_date: dueDate,
          energy_level_required: 'medium',
          best_time_of_day: 'anytime',
          completed: false,
        });

      if (error) throw error;

      toast.success('Loaded into Cargo Bay', {
        description: title || raw,
        icon: <Package className="w-4 h-4" />,
      });

      setInput('');
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add task');
    } finally {
      setSaving(false);
    }
  }, [input, saving, supabase]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
              onClick={() => setOpen(false)}
            />

            {/* Omni-Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg px-4"
            >
              <div className="bg-white rounded-3xl border-4 border-surface-900 shadow-[0_40px_80px_rgba(0,0,0,0.25)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 bg-surface-50 border-b border-surface-100">
                  <OllieAvatar mood="happy" size="sm" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-surface-400">
                      Quick Capture
                    </p>
                    <p className="text-xs text-surface-500">
                      Type anything. Ollie figures out the rest.
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-surface-200 transition-colors text-surface-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4">
                  <div className="relative">
                    <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-300" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder='e.g. "Finish math homework 45m tomorrow"'
                      className="w-full pl-12 pr-4 py-4 bg-surface-50 border-2 border-surface-200 rounded-2xl text-surface-900 font-bold placeholder:text-surface-300 placeholder:font-medium focus:outline-none focus:border-brand-500 transition-colors text-sm"
                    />
                  </div>

                  {/* Smart Hints */}
                  <div className="flex items-center gap-3 mt-3 px-1">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-surface-300">
                      <Clock className="w-3 h-3" /> "30m" or "1h"
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-surface-300">
                      <Calendar className="w-3 h-3" /> "today" or "tomorrow"
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-surface-300">
                      <Zap className="w-3 h-3" /> Enter to save
                    </span>
                  </div>
                </form>

                {/* Shortcut Footer */}
                <div className="px-4 py-2.5 bg-surface-50 border-t border-surface-100 flex items-center justify-center gap-2">
                  <kbd className="px-2 py-0.5 bg-surface-200 text-surface-500 rounded-md text-[10px] font-black">
                    ⌘J
                  </kbd>
                  <span className="text-[10px] font-bold text-surface-400">to toggle • </span>
                  <kbd className="px-2 py-0.5 bg-surface-200 text-surface-500 rounded-md text-[10px] font-black">
                    ESC
                  </kbd>
                  <span className="text-[10px] font-bold text-surface-400">to close</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

