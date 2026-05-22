'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getRandomRescheduleMessage } from '@/lib/taskHelpers';

interface ShameFreeRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (newDate: string) => void;
  taskTitle: string;
}

export default function ShameFreeRescheduleModal({
  isOpen, onClose, onReschedule, taskTitle,
}: ShameFreeRescheduleModalProps) {
  const [customDate, setCustomDate] = useState('');

  if (!isOpen) return null;

  const message = getRandomRescheduleMessage();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const formatSuggestion = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  const suggestions = [
    { label: `Tomorrow — ${formatSuggestion(tomorrow)}`, value: toISO(tomorrow) },
    { label: `Day after — ${formatSuggestion(dayAfter)}`, value: toISO(dayAfter) },
    { label: `Next week — ${formatSuggestion(nextWeek)}`, value: toISO(nextWeek) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[var(--color-paper)] border border-[var(--color-line-strong)] p-6 z-10 rounded-[20px] shadow-xl"
      >
        <h2 className="text-lg font-serif italic font-semibold text-[var(--color-ink)] mb-1">When would work better?</h2>
        <p className="text-sm text-[var(--color-ink-soft)] mb-2 leading-relaxed">{message}</p>
        <p className="text-xs text-[var(--color-ink-faint)] mb-4 truncate bg-[var(--color-cream)]/20 border border-[var(--color-line)] rounded-lg px-2.5 py-1.5">
          Task: <span className="font-medium text-[var(--color-ink-soft)]">{taskTitle}</span>
        </p>

        <div className="space-y-2 mb-4">
          {suggestions.map(s => (
            <button key={s.value} onClick={() => { onReschedule(s.value); onClose(); }}
              className="w-full text-left px-4 py-3 bg-[var(--color-cream)]/10 border border-[var(--color-line)] hover:border-[var(--color-honey)] hover:bg-[var(--color-cream)]/35 text-[var(--color-ink)] text-sm font-medium rounded-xl transition-all cursor-pointer">
              {s.label}
            </button>
          ))}
        </div>

        <div className="border-t border-[var(--color-line)] pt-4">
          <label className="block text-[11px] font-mono font-semibold tracking-wider text-[var(--color-ink-faint)] mb-2 uppercase">
            Pick a custom date
          </label>
          <div className="flex gap-2">
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-[var(--color-cream)]/20 border border-[var(--color-line)] text-[var(--color-ink)] text-sm rounded-xl focus:outline-none focus:border-[var(--color-honey)] transition-colors" />
            <button onClick={() => { if (customDate) { onReschedule(customDate); onClose(); } }}
              disabled={!customDate}
              className="px-5 py-2.5 bg-[var(--color-ink)] text-[var(--color-paper)] font-bold text-sm rounded-xl disabled:opacity-40 hover:bg-[var(--color-ink-soft)] transition-colors cursor-pointer">
              Set
            </button>
          </div>
        </div>

        <button onClick={onClose}
          className="mt-4 w-full py-2.5 text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-semibold transition-colors cursor-pointer border border-transparent hover:bg-[var(--color-cream)]/25 rounded-xl">
          Never mind
        </button>
      </motion.div>
    </div>
  );
}
