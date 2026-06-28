'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useUIStore } from '@/lib/store/ui-store';
import { useTaskActions } from '@/hooks/useTaskActions';

export default function QuickCaptureModal() {
  const { quickCaptureOpen, setQuickCaptureOpen } = useUIStore();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<'today' | 'tomorrow' | 'none'>('today');
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setDueDate('today');
    setDuration(30);
  };

  const { addTask } = useTaskActions({});

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    let targetDate: string | undefined;
    if (dueDate !== 'none') {
      const d = new Date();
      if (dueDate === 'tomorrow') {
        d.setDate(d.getDate() + 1);
      }
      targetDate = d.toISOString().split('T')[0];
    }

    setQuickCaptureOpen(false);
    resetForm();

    void addTask({
      title: trimmed,
      estimated_minutes: duration,
      due_date: targetDate,
    }).then((result) => {
      if (result.error) {
        toast.error(result.error);
      }
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
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="quick-capture-title" className="sr-only">
                    Task title
                  </label>
                  <input
                    ref={inputRef}
                    id="quick-capture-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to get done?"
                    className="w-full text-lg bg-transparent border-none outline-none placeholder:text-[var(--color-ink-faint)] text-[var(--color-ink)]"
                    autoComplete="off"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {(['today', 'tomorrow', 'none'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDueDate(option)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        dueDate === option
                          ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:border-[var(--color-line-strong)]'
                      }`}
                    >
                      {option === 'today' ? 'Today' : option === 'tomorrow' ? 'Tomorrow' : 'No date'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {([15, 30, 60] as const).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDuration(mins)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        duration === mins
                          ? 'bg-[var(--color-honey)] text-[var(--color-ink)] border-[var(--color-honey)]'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:border-[var(--color-line-strong)]'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="w-full py-3 rounded-xl bg-[var(--color-ink)] text-[var(--color-paper)] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  Add task
                </button>
              </form>
            </motion.div>
          </div>
        </>
        )}
      </AnimatePresence>
    </>
  );
}
