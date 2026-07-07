'use client';

import { motion } from 'framer-motion';
import { ListChecks } from '@phosphor-icons/react';
import { BrunoDemoShell } from './BrunoDemoShell';
import { BrunoProposalCard } from './BrunoProposalCard';
import { useBrunoDemoScript } from './useBrunoDemoScript';
import { useBrunoPersona } from './BrunoPersonaContext';

/** Chapter 3 — multi-step day repair (APPLY_PLAN) */
export function BrunoChapterDayRepairInView() {
  const { ref, step, finished, replay } = useBrunoDemoScript({ steps: 6, intervalMs: 1700 });
  const { scenario } = useBrunoPersona();

  const showPlan = step >= 3;
  const approved = step >= 4;
  const applied = step >= 5;

  return (
    <div ref={ref} aria-hidden>
      <BrunoDemoShell
        userMessage={scenario.repairMessage}
        step={step}
        thinkingStep={2}
        minHeight="200px"
        showReplay={finished}
        onReplay={replay}
        footer={
          showPlan ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-2.5"
            >
              <p className="mb-2 font-mono text-[8px] font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">
                {applied ? 'Afternoon · updated' : 'Proposed plan · 3 steps'}
              </p>
              <ul className="flex flex-col gap-1">
                {scenario.repairSteps.map((s, i) => (
                  <li
                    key={s}
                    className={`rounded-md px-2 py-1 text-[10px] ${
                      applied
                        ? 'bg-[var(--color-forest)]/10 text-[var(--color-forest)]'
                        : 'bg-[var(--color-paper)] text-[var(--color-ink-soft)]'
                    }`}
                  >
                    {i + 1}. {s}
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : null
        }
      >
        {showPlan && (
          <BrunoProposalCard
            intro="Here's how I'd fix your afternoon — all at once?"
            title="Repair afternoon"
            meta={`${scenario.repairSteps.length} steps`}
            icon={ListChecks}
            approved={approved}
            approveLabel="Apply plan"
            approvedLabel="Applied"
          />
        )}
      </BrunoDemoShell>
    </div>
  );
}

/** Shared day repair demo for skill explorer */
export function BrunoDayRepairDemo() {
  return <BrunoChapterDayRepairInView />;
}
