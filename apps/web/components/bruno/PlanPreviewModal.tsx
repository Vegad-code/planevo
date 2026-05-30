'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck,
  Check,
  X,
  Lightning,
  BatteryCharging,
  Leaf,
  CaretDown,
  CaretUp,
  PaperPlaneTilt,
  GoogleLogo,
} from '@phosphor-icons/react';
import type { PlanDraftItemData } from './PlanDraftCard';

interface PlanPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  planObjective: string;
  items: PlanDraftItemData[];
  onApprove: (options: { syncToGoogle: boolean; createTasks: boolean; blockCalendar: boolean }) => void;
  onRequestEdit: (feedback: string) => void;
  isCommitting?: boolean;
  hasGoogleCalendar?: boolean;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function EnergyBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { icon: Lightning, label: 'High', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
    medium: { icon: BatteryCharging, label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
    low: { icon: Leaf, label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  };
  const c = config[level];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.color} ${c.bg} border ${c.border}`}>
      <Icon weight="fill" className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function PlanItem({ item, index }: { item: PlanDraftItemData; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 shadow-sm ${
          item.energy_level === 'high' ? 'bg-red-400 shadow-red-400/40' :
          item.energy_level === 'medium' ? 'bg-amber-400 shadow-amber-400/40' : 'bg-emerald-400 shadow-emerald-400/40'
        }`} />
        <div className="flex-1 w-px bg-[#3e3227] mt-1" />
      </div>

      <div className="ml-7">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left flex items-start justify-between gap-3 py-2 cursor-pointer hover:bg-white/5 rounded-xl px-3 -mx-3 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#fdfbf7]/50 font-mono tracking-wide">
              {formatTime(item.start_time)} – {formatTime(item.end_time)}
            </p>
            <p className="text-[15px] font-bold text-[#fdfbf7] mt-0.5 leading-snug">
              {item.title}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 mt-1">
            <EnergyBadge level={item.energy_level} />
            {expanded ? (
              <CaretUp weight="bold" className="w-4 h-4 text-[#fdfbf7]/40" />
            ) : (
              <CaretDown weight="bold" className="w-4 h-4 text-[#fdfbf7]/40" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 mb-4 mx-3 p-4 bg-black/20 rounded-xl border border-[#3e3227]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#fdfbf7]/40 mb-2">
                  How to Execute
                </p>
                <p className="text-[13.5px] text-[#fdfbf7]/80 leading-relaxed whitespace-pre-line">
                  {item.execution_description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function PlanPreviewModal({
  isOpen,
  onClose,
  planTitle,
  planObjective,
  items,
  onApprove,
  onRequestEdit,
  isCommitting = false,
  hasGoogleCalendar = false,
}: PlanPreviewModalProps) {
  const [feedback, setFeedback] = useState('');
  const [createTasks, setCreateTasks] = useState(true);
  const [blockCalendar, setBlockCalendar] = useState(true);
  const [syncToGoogle, setSyncToGoogle] = useState(hasGoogleCalendar);

  if (!isOpen) return null;

  const itemsByDate = items.reduce<Record<string, PlanDraftItemData[]>>((acc, item) => {
    const date = formatDate(item.start_time);
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    onRequestEdit(feedback);
    setFeedback('');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-120 flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-3xl max-h-full flex flex-col bg-[#1e1712] rounded-4xl border border-[#3e3227] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-[#3e3227] bg-[#2c221a]">
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-3 mb-2">
                <CalendarCheck weight="fill" className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-bold text-[#fdfbf7]">{planTitle}</h2>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  Draft
                </span>
              </div>
              <p className="text-[14px] text-[#fdfbf7]/60 leading-relaxed">
                {planObjective}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#fdfbf7]/40 hover:text-[#fdfbf7] hover:bg-[#3e3227] transition-colors"
              title="Close plan preview"
            >
              <X weight="bold" className="w-5 h-5" />
            </button>
          </div>

          {/* Content area: Timeline + Right Panel */}
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            
            {/* Timeline (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#3e3227] scrollbar-track-transparent">
              <div className="space-y-6">
                {Object.entries(itemsByDate).map(([date, dateItems]) => (
                  <div key={date}>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#fdfbf7]/30 mb-4 sticky top-0 bg-[#1e1712] py-2 z-10">
                      {date}
                    </p>
                    <div className="space-y-2">
                      {dateItems.map((item, i) => (
                        <PlanItem key={`${item.title}-${i}`} item={item} index={i} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions & Feedback Panel */}
            <div className="w-full md:w-[320px] shrink-0 bg-[#2c221a] border-t md:border-t-0 md:border-l border-[#3e3227] p-6 flex flex-col gap-6 overflow-y-auto">
              
              {/* Approval Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#fdfbf7]">Execution Preferences</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={createTasks}
                      onChange={(e) => setCreateTasks(e.target.checked)}
                      className="w-5 h-5 rounded-md border-[#3e3227] bg-black/20 text-amber-400 focus:ring-amber-400/30 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-[#fdfbf7]/80 group-hover:text-[#fdfbf7] transition-colors">
                      Create as Tasks in Backlog
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={blockCalendar}
                      onChange={(e) => setBlockCalendar(e.target.checked)}
                      className="w-5 h-5 rounded-md border-[#3e3227] bg-black/20 text-amber-400 focus:ring-amber-400/30 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-[#fdfbf7]/80 group-hover:text-[#fdfbf7] transition-colors">
                      Block Time on Calendar
                    </span>
                  </label>
                  
                  {blockCalendar && (
                    <label className="flex items-center gap-2 cursor-pointer group pl-8">
                      <input
                        type="checkbox"
                        checked={syncToGoogle}
                        onChange={(e) => setSyncToGoogle(e.target.checked)}
                        className="w-4 h-4 rounded border-[#3e3227] bg-black/20 text-blue-400 focus:ring-blue-400/30 cursor-pointer"
                      />
                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#fdfbf7]/60 group-hover:text-[#fdfbf7]/80 transition-colors">
                        <GoogleLogo weight="bold" className="w-3.5 h-3.5" />
                        Sync to Google Calendar
                        {!hasGoogleCalendar && (
                          <span className="text-[10px] text-[#fdfbf7]/30">(not connected)</span>
                        )}
                      </span>
                    </label>
                  )}
                </div>

                <button
                  onClick={() => onApprove({ syncToGoogle, createTasks, blockCalendar })}
                  disabled={isCommitting || (!createTasks && !blockCalendar)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[#2c221a] bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCommitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#2c221a]/30 border-t-[#2c221a] rounded-full animate-spin" />
                      Committing...
                    </>
                  ) : (
                    <>
                      <Check weight="bold" className="w-4 h-4" />
                      Approve & Execute
                    </>
                  )}
                </button>
              </div>

              <div className="h-px bg-[#3e3227]" />

              {/* Revision Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#fdfbf7]">Request Changes</h3>
                <form onSubmit={handleEditSubmit} className="relative">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="E.g., Make the test shorter, start at 9am instead..."
                    className="w-full bg-black/20 border border-[#3e3227] rounded-xl text-[#fdfbf7] placeholder:text-[#fdfbf7]/30 text-sm p-3 min-h-25 resize-none focus:outline-none focus:border-[#fdfbf7]/30 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!feedback.trim() || isCommitting}
                    className="absolute bottom-3 right-3 p-2 bg-[#fdfbf7] hover:bg-[#f4ebe1] text-[#2c221a] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send feedback"
                  >
                    <PaperPlaneTilt weight="fill" className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
