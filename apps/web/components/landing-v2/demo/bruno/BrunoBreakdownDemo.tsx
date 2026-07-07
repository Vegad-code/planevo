'use client';

import { motion } from 'framer-motion';
import { ListChecks } from '@phosphor-icons/react';
import { BrunoDemoShell } from './BrunoDemoShell';
import { BrunoMiniBoard } from './BrunoMiniBoard';
import { useBrunoDemoScript } from './useBrunoDemoScript';
import { useBrunoPersona } from './BrunoPersonaContext';

export function BrunoBreakdownDemo() {
  const { ref, step, finished, replay } = useBrunoDemoScript({ steps: 5, intervalMs: 1400 });
  const { scenario } = useBrunoPersona();

  const showTasks = step >= 3;
  const taskCount = step >= 4 ? scenario.breakdownTasks.length : Math.min(2, scenario.breakdownTasks.length);

  return (
    <div ref={ref} aria-hidden>
      <BrunoDemoShell
        userMessage={`Break down my ${scenario.breakdownTitle.toLowerCase()} into tasks`}
        step={step}
        thinkingStep={2}
        minHeight="200px"
        showReplay={finished}
        onReplay={replay}
        footer={
          showTasks ? (
            <BrunoMiniBoard tasks={scenario.breakdownTasks} visibleCount={taskCount} title="Proposed tasks" />
          ) : null
        }
      >
        {showTasks && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-2xl rounded-tl-md border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-3"
          >
            <ListChecks size={16} weight="bold" className="mt-0.5 text-[var(--color-honey-deep)]" />
            <p className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
              I split <strong className="text-[var(--color-ink)]">{scenario.breakdownTitle}</strong> into{' '}
              {scenario.breakdownTasks.length} schedulable steps — want me to add them?
            </p>
          </motion.div>
        )}
      </BrunoDemoShell>
    </div>
  );
}
