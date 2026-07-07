'use client';

import { ScrollReveal } from '../motion/ScrollReveal';
import { Eyebrow } from '../Eyebrow';
import { BrunoPersonaProvider, useBrunoPersona } from '../demo/bruno/BrunoPersonaContext';
import { BRUNO_PERSONAS } from '../demo/bruno/brunoFixtures';
import { BrunoScrollStory } from './BrunoScrollStory';
import { BrunoStudentLifeStrip } from './BrunoStudentLifeStrip';
import { BrunoSkillsExplorer } from './BrunoSkillsExplorer';
import { BrunoProTease } from '../demo/bruno/BrunoIntegrationsDemo';
import { BrunoEmotionalBeat } from './BrunoEmotionalBeat';
import { EditorialSection } from '../editorial/EditorialSection';
import { cn } from '@/lib/utils';

function BrunoSectionContent() {
  const { persona, setPersona, personaMeta } = useBrunoPersona();

  return (
    <EditorialSection id="bruno" tone="charcoal" roundedTop className="scroll-mt-24 px-6 py-16 sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 sm:gap-16">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <Eyebrow className="text-[var(--color-paper)]/60">How Bruno can help · Your AI companion</Eyebrow>
          <h2 className="font-serif text-[36px] leading-[1.06] tracking-tight text-[var(--color-paper)] sm:text-[52px]">
            Made for the way <em className="not-italic text-[var(--color-paper)]/90">you</em> work
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--color-paper)]/75">
            Planevo has a real AI inside. Bruno adapts to planning, tasks, and reflection — and always
            proposes changes for you to confirm before anything happens.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <div className="flex flex-wrap justify-center gap-2">
            {BRUNO_PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersona(p.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-[13px] font-medium transition-colors',
                  persona === p.id
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
              {personaMeta.headline}
            </h3>
            <p className="mt-4 text-[16px] leading-relaxed text-[var(--color-paper)]/75">{personaMeta.body}</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <BrunoScrollStory />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <BrunoStudentLifeStrip />
        </ScrollReveal>

        <ScrollReveal delay={0.12}>
          <BrunoSkillsExplorer />
        </ScrollReveal>

        <ScrollReveal delay={0.14}>
          <BrunoProTease />
        </ScrollReveal>

        <ScrollReveal delay={0.16}>
          <BrunoEmotionalBeat />
        </ScrollReveal>
      </div>
    </EditorialSection>
  );
}

export function BrunoSection() {
  return (
    <BrunoPersonaProvider>
      <BrunoSectionContent />
    </BrunoPersonaProvider>
  );
}
