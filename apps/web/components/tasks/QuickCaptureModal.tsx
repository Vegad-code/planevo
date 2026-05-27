'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/lib/store/ui-store';
import { useTaskActions } from '@/hooks/useTaskActions';

export default function QuickCaptureModal() {
  const { quickCaptureOpen, setQuickCaptureOpen } = useUIStore();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<'today' | 'tomorrow' | 'none'>('today');
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addTask, saving } = useTaskActions(() => {
    setQuickCaptureOpen(false);
    setTitle('');
    setDueDate('today');
    setDuration(30);
  });

  // Handle Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickCaptureOpen(!quickCaptureOpen);
      }
      if (e.key === 'Escape' && quickCaptureOpen) {
        setQuickCaptureOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickCaptureOpen, setQuickCaptureOpen]);

  // Focus input when opened
  useEffect(() => {
    if (quickCaptureOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [quickCaptureOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;

    let targetDate = undefined;
    if (dueDate !== 'none') {
      const d = new Date();
      if (dueDate === 'tomorrow') {
        d.setDate(d.getDate() + 1);
      }
      targetDate = d.toISOString().split('T')[0];
    }

    await addTask({
      title: title.trim(),
      estimated_minutes: duration,
      due_date: targetDate,
    });
  };

  return (
    <>
      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-6 z-40 sm:hidden">
        <button
          onClick={() => setQuickCaptureOpen(true)}
          className="w-14 h-14 bg-[var(--color-ink)] text-[var(--color-paper)] rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
          aria-label="Quick capture task"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {quickCaptureOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-50 backdrop-blur-sm"
            onClick={() => setQuickCaptureOpen(false)}
          />

          {/* Modal Container */}
          <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 pointer-events-none px-4 sm:px-0 mb-4 sm:mb-0">
            <motion.div
              initial={{ y: '100%', opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-4 sm:p-6 w-full max-w-lg pointer-events-auto flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What's on your mind?"
                  className="w-full text-lg sm:text-xl font-medium bg-transparent border-none outline-none text-[var(--color-ink)] placeholder-[var(--color-ink-soft)]/50"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                />
                
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-line)]/50">
                  <div className="flex gap-2">
                    {/* Date Selector */}
                    <select
                      className="text-xs bg-[var(--color-cream)] border border-[var(--color-line)] rounded-full px-3 py-1.5 outline-none text-[var(--color-ink-soft)] cursor-pointer"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value as any)}
                      disabled={saving}
                    >
                      <option value="today">Today</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="none">No Date</option>
                    </select>

                    {/* Duration Selector */}
                    <select
                      className="text-xs bg-[var(--color-cream)] border border-[var(--color-line)] rounded-full px-3 py-1.5 outline-none text-[var(--color-ink-soft)] cursor-pointer"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value) as any)}
                      disabled={saving}
                    >
                      <option value={15}>15m</option>
                      <option value={30}>30m</option>
                      <option value={60}>1h</option>
                    </select>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!title.trim() || saving}
                    className="bg-[var(--color-ink)] text-[var(--color-paper)] text-sm font-medium px-4 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {saving ? 'Saving...' : 'Save (Enter)'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
