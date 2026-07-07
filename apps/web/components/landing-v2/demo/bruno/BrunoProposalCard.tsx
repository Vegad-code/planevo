'use client';

import { motion } from 'framer-motion';
import { Check, type Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface BrunoProposalCardProps {
  intro?: string;
  title: string;
  meta: string;
  icon?: Icon;
  iconSlot?: React.ReactNode;
  approved?: boolean;
  approveLabel?: string;
  approvedLabel?: string;
  className?: string;
}

export function BrunoProposalCard({
  intro = 'Here\u2019s what I found — want me to do it?',
  title,
  meta,
  icon: IconComponent,
  iconSlot,
  approved = false,
  approveLabel = 'Approve',
  approvedLabel = 'Added',
  className,
}: BrunoProposalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={cn(
        'rounded-2xl rounded-tl-md border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-3',
        className,
      )}
    >
      <p className="mb-2 text-[12px] leading-snug text-[var(--color-ink-soft)]">{intro}</p>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-2">
        {iconSlot ?? (
          IconComponent ? (
            <IconComponent size={16} weight="bold" className="text-[var(--color-honey-deep)]" />
          ) : null
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold text-[var(--color-ink)]">{title}</span>
          <span className="block font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-soft)]">
            {meta}
          </span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors',
            approved ? 'bg-[var(--color-forest)] text-white' : 'bg-[var(--color-ink)] text-white',
          )}
        >
          {approved && <Check size={9} weight="bold" />}
          {approved ? approvedLabel : approveLabel}
        </span>
        {!approved && (
          <span className="rounded-full border border-[var(--color-line)] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
            Edit
          </span>
        )}
      </div>
    </motion.div>
  );
}
