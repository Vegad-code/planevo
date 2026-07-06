'use client';

import { useState } from 'react';
import { ScrollReveal } from '../motion/ScrollReveal';
import { Eyebrow } from '../Eyebrow';
import { BrunoSkillsGrid } from '../demo/BrunoSkillsGrid';
import { BrunoDemoTabs } from '../demo/BrunoDemoTabs';
import { EditorialSection } from '../editorial/EditorialSection';
import { cn } from '@/lib/utils';

const PERSONAS = [
  {
    id: 'students',
    label: 'Students',
    headline: 'For students whose weeks never stay still',
    body: 'Capture class work, practices, and life in one breath. Planevo sorts it onto a calm board and plans it into the gaps you actually have.',
  },
  {
    id: 'creators',
    label: 'Creators',
    headline: 'For creators juggling a hundred threads',
    body: 'Dump ideas, deadlines, and follow-ups without losing the thread. Bruno helps you turn chaos into a board you can actually work from.',
  },
  {
    id: 'leaders',
    label: 'Leaders',
    headline: 'For leaders who need the team aligned',
    body: 'See what is on your plate, what moved, and what needs a decision — without another status meeting.',
  },
] as const;

export function BrunoSection() {
  const [active, setActive] = useState<(typeof PERSONAS)[number]['id']>('students');
  const persona = PERSONAS.find((p) => p.id === active) ?? PERSONAS[0];

  return (
    <EditorialSection id="bruno" tone="charcoal" roundedTop className="scroll-mt-24 px-6 py-16 sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 sm:gap-16">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="text-[var(--color-paper)]/60">How Bruno can help · Your AI companion</Eyebrow>
          <h2 className="font-serif text-[36px] leading-[1.06] tracking-tight text-[var(--color-paper)] sm:text-[52px]">
            Made for the way <em className="not-italic text-[var(--color-paper)]/90">you</em> work
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--color-paper)]/75">
            Planevo has a real AI inside. Bruno adapts to planning, tasks, and reflection
            — and always proposes changes for you to confirm before anything happens.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <div className="flex flex-wrap justify-center gap-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-[13px] font-medium transition-colors',
                  active === p.id
                    ? 'bg-[var(--color-paper)] text-[var(--color-charcoal)]'
                    : 'border border-[var(--color-paper)]/20 text-[var(--color-paper)]/75 hover:border-[var(--color-paper)]/40 hover:text-[var(--color-paper)]',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-2xl text-center">
            <h3 className="font-serif text-[28px] leading-tight text-[var(--color-paper)] sm:text-[32px]">
              {persona.headline}
            </h3>
            <p className="mt-4 text-[16px] leading-relaxed text-[var(--color-paper)]/75">{persona.body}</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <BrunoSkillsGrid />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <BrunoDemoTabs />
        </ScrollReveal>
      </div>
    </EditorialSection>
  );
}
