'use client';

import { CalendarPlus } from '@phosphor-icons/react';
import { BrunoDemoShell } from './BrunoDemoShell';
import { BrunoProposalCard } from './BrunoProposalCard';
import { BrunoMiniCalendar } from './BrunoMiniCalendar';
import { useBrunoDemoScript } from './useBrunoDemoScript';
import { useBrunoPersona } from './BrunoPersonaContext';

/** Chapter 1 — propose → approve → calendar update */
export function BrunoChapterTrustInView() {
  const { ref, step, finished, replay } = useBrunoDemoScript({ steps: 6, intervalMs: 1500 });
  const { scenario } = useBrunoPersona();

  const showProposal = step >= 3;
  const approved = step >= 4;
  const onCalendar = step >= 5;

  return (
    <div ref={ref} aria-hidden>
      <BrunoDemoShell
        userMessage={scenario.trustMessage}
        step={step}
        thinkingStep={2}
        showReplay={finished}
        onReplay={replay}
        footer={
          <BrunoMiniCalendar
            highlightDay={scenario.trustDay}
            eventLabel={scenario.trustEventTitle.split(' ')[0]}
            eventTime="2 PM"
            showEvent={onCalendar}
          />
        }
      >
        {showProposal && (
          <BrunoProposalCard
            intro="Here\u2019s the event — want me to add it?"
            title={scenario.trustEventTitle}
            meta={scenario.trustEventMeta}
            icon={CalendarPlus}
            approved={approved}
          />
        )}
      </BrunoDemoShell>
    </div>
  );
}
