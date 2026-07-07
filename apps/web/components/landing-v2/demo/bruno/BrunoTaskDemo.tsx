'use client';

import { CheckSquare } from '@phosphor-icons/react';
import { BrunoDemoShell } from './BrunoDemoShell';
import { BrunoProposalCard } from './BrunoProposalCard';
import { BrunoMiniBoard } from './BrunoMiniBoard';
import { useBrunoDemoScript } from './useBrunoDemoScript';

const TASK_ROWS = [
  { id: 't1', title: 'Study for algebra quiz', meta: 'Tomorrow', priority: 'urgent' as const },
  { id: 't2', title: 'Email teacher', meta: 'Today', priority: 'high' as const },
  { id: 't3', title: 'Bio lab outline', meta: 'Fri', priority: 'normal' as const },
];

export function BrunoTaskDemo() {
  const { ref, step, finished, replay } = useBrunoDemoScript({ steps: 5, intervalMs: 1400 });

  const showProposal = step >= 3;
  const approved = step >= 4;

  return (
    <div ref={ref} aria-hidden>
      <BrunoDemoShell
        userMessage="Add a task called study AP Macro and mark algebra quiz done"
        step={step}
        thinkingStep={2}
        showReplay={finished}
        onReplay={replay}
        footer={<BrunoMiniBoard tasks={TASK_ROWS} title="Your tasks" />}
      >
        {showProposal && (
          <BrunoProposalCard
            intro="Two changes — approve both?"
            title="Study AP Macro"
            meta="New task · normal priority"
            icon={CheckSquare}
            approved={approved}
            approvedLabel="Done"
          />
        )}
      </BrunoDemoShell>
    </div>
  );
}
