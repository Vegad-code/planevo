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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[#1e1e1e] border-2 border-[#2A2A2A] p-6 z-10"
      >
        <h2 className="text-lg font-bold text-white mb-1">When would work better?</h2>
        <p className="text-sm text-[#888] mb-2">{message}</p>
        <p className="text-xs text-[#666] mb-4 truncate">Task: {taskTitle}</p>

        <div className="space-y-2 mb-4">
          {suggestions.map(s => (
            <button key={s.value} onClick={() => { onReschedule(s.value); onClose(); }}
              className="w-full text-left px-4 py-3 bg-[#242424] border-2 border-[#2A2A2A] hover:border-[#4ECDC4] text-white text-sm font-medium transition-colors">
              {s.label}
            </button>
          ))}
        </div>

        <div className="border-t border-[#2A2A2A] pt-4">
          <label className="block text-xs font-semibold text-[#888] mb-1.5 uppercase tracking-wider">
            Pick a custom date
          </label>
          <div className="flex gap-2">
            <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#242424] border-2 border-[#2A2A2A] text-white text-sm focus:outline-none focus:border-[#4ECDC4]" />
            <button onClick={() => { if (customDate) { onReschedule(customDate); onClose(); } }}
              disabled={!customDate}
              className="px-4 py-2 bg-[#4ECDC4] text-white font-bold text-sm disabled:opacity-40 hover:bg-[#45b8b0]">
              Set
            </button>
          </div>
        </div>

        <button onClick={onClose}
          className="mt-4 w-full py-2 text-sm text-[#888] hover:text-white font-medium transition-colors">
          Never mind
        </button>
      </motion.div>
    </div>
  );
}
