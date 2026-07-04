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
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={isCommitting}
        initial={{ opacity: 0, y: 15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="group flex w-full max-w-[280px] flex-col overflow-hidden rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)] text-left shadow-sm transition-all hover:border-[var(--color-honey)]/40 hover:shadow-md disabled:opacity-60"
      >
        <div className="flex items-center justify-between gap-3 bg-[var(--color-settings-bg)]/60 p-4">
          <div className="flex items-center gap-2.5">
            <CalendarCheck weight="fill" className="h-5 w-5 text-[var(--color-honey)]" />
            <h4 className="truncate text-[14px] font-bold text-[var(--color-settings-text)]">{planTitle}</h4>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--color-honey)]/25 bg-[var(--color-honey)]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--color-honey)]">
            Draft
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--color-settings-border)] bg-[var(--color-settings-bg)]/40 p-3">
          <span className="text-[12px] font-medium text-[var(--color-settings-text-muted)] transition-colors group-hover:text-[var(--color-honey)]">
            {isCommitting ? 'Submitting plan…' : `Review ${items.length} items`}
          </span>
          <ArrowRight
            weight="bold"
            className="h-4 w-4 text-[var(--color-settings-text-muted)] transition-all group-hover:translate-x-1 group-hover:text-[var(--color-honey)]"
          />
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
