'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, ArrowRight } from '@phosphor-icons/react';
import PlanPreviewModal from './PlanPreviewModal';

export interface PlanDraftItemData {
  title: string;
  start_time: string;
  end_time: string;
  energy_level: 'high' | 'medium' | 'low';
  execution_description: string;
}

interface PlanDraftCardProps {
  planTitle: string;
  planObjective: string;
  items: PlanDraftItemData[];
  onApprove: (options: { syncToGoogle: boolean; createTasks: boolean; blockCalendar: boolean }) => void;
  onRequestEdit: (feedback: string) => void;
  isCommitting?: boolean;
  hasGoogleCalendar?: boolean;
}

export default function PlanDraftCard({
  planTitle,
  planObjective,
  items,
  onApprove,
  onRequestEdit,
  isCommitting = false,
  hasGoogleCalendar = false,
}: PlanDraftCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setIsModalOpen(true)}
        initial={{ opacity: 0, y: 15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-[280px] group flex flex-col rounded-2xl border border-[#fdfbf7]/10 bg-gradient-to-b from-[#382c20] to-[#2c221a] shadow-lg hover:shadow-xl hover:border-amber-500/30 transition-all overflow-hidden text-left"
      >
        <div className="p-4 flex items-center justify-between gap-3 bg-white/5">
          <div className="flex items-center gap-2.5">
            <CalendarCheck weight="fill" className="w-5 h-5 text-amber-400" />
            <h4 className="text-[14px] font-bold text-[#fdfbf7] truncate">{planTitle}</h4>
          </div>
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
            Draft
          </span>
        </div>
        <div className="p-3 bg-black/20 flex items-center justify-between">
          <span className="text-[12px] font-medium text-[#fdfbf7]/60 group-hover:text-amber-400 transition-colors">
            Review {items.length} items
          </span>
          <ArrowRight weight="bold" className="w-4 h-4 text-[#fdfbf7]/40 group-hover:text-amber-400 transition-colors group-hover:translate-x-1" />
        </div>
      </motion.button>

      <PlanPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        planTitle={planTitle}
        planObjective={planObjective}
        items={items}
        onApprove={async (options) => {
          setIsModalOpen(false);
          onApprove(options);
        }}
        onRequestEdit={(feedback) => {
          setIsModalOpen(false);
          onRequestEdit(feedback);
        }}
        isCommitting={isCommitting}
        hasGoogleCalendar={hasGoogleCalendar}
      />
    </>
  );
}
