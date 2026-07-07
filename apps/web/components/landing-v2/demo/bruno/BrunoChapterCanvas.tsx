'use client';

import { motion } from 'framer-motion';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { CanvasIcon } from '@/components/icons/BrandIcons';
import { BrunoDemoShell } from './BrunoDemoShell';
import { BrunoProposalCard } from './BrunoProposalCard';
import { useBrunoDemoScript } from './useBrunoDemoScript';
import { useBrunoPersona } from './BrunoPersonaContext';

/** Chapter 2 — Canvas-aware reschedule */
export function BrunoChapterCanvasInView() {
  const { ref, step, finished, replay } = useBrunoDemoScript({ steps: 6, intervalMs: 1600 });
  const { scenario } = useBrunoPersona();

  const showContext = step >= 3;
  const showProposal = step >= 4;
  const approved = step >= 5;

  return (
    <div ref={ref} aria-hidden>
      <BrunoDemoShell
        userMessage={scenario.canvasMessage}
        step={step}
        thinkingStep={2}
        minHeight="220px"
        showReplay={finished}
        onReplay={replay}
        footer={
          showContext ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-2.5"
            >
              <p className="mb-2 font-mono text-[8px] font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">
                Canvas · connected
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-2">
                <CanvasIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-[var(--color-ink)]">
                    {scenario.canvasAssignment.title}
                  </span>
                  <span className="block font-mono text-[8px] uppercase tracking-wider text-[var(--color-ink-soft)]">
                    {scenario.canvasAssignment.course} · due {scenario.canvasAssignment.due}
                  </span>
                </span>
              </div>
            </motion.div>
          ) : null
        }
      >
        {showProposal && (
          <BrunoProposalCard
            intro="I found it on your board — reschedule to tomorrow?"
            title={scenario.canvasAssignment.title}
            meta="Tomorrow · 10:00 AM"
            icon={ArrowsClockwise}
            approved={approved}
            approvedLabel="Moved"
          />
        )}
      </BrunoDemoShell>
    </div>
  );
}
