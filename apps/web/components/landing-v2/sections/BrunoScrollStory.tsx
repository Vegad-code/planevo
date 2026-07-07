'use client';

import { useReducedMotion } from 'framer-motion';
import { SCROLL_CHAPTER_DEMOS } from '../demo/bruno/BrunoScenarioPanel';
import { useBrunoPersona } from '../demo/bruno/BrunoPersonaContext';
import { ScrollReveal } from '../motion/ScrollReveal';

const CHAPTERS = [
  {
    eyebrow: 'Chapter 1 · Trust',
    headline: 'Propose · Approve · Done',
    body: 'Bruno never changes your calendar without asking. You see exactly what he\u2019ll do — then one tap to confirm.',
    caption: 'You stay in control',
  },
  {
    eyebrow: 'Chapter 2 · Context',
    headline: 'He reads your real life',
    body: 'When Canvas is connected, Bruno sees your assignments and due dates — then proposes moves that fit your actual week.',
    caption: 'Canvas-aware · not magic',
  },
  {
    eyebrow: 'Chapter 3 · Recovery',
    headline: 'Fix the day when it falls apart',
    body: 'Behind on everything? Bruno reads your calendar, drafts a multi-step repair plan, and waits for your OK before reshuffling.',
    caption: 'The painkiller moment',
  },
] as const;

export function BrunoScrollStory() {
  const reduce = useReducedMotion();
  const { persona } = useBrunoPersona();

  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      {CHAPTERS.map((chapter, i) => {
        const Demo = SCROLL_CHAPTER_DEMOS[i];
        return (
          <ScrollReveal key={chapter.eyebrow} delay={i * 0.05}>
            <div
              className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              <div className="flex flex-col gap-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-paper)]/55">
                  {chapter.eyebrow}
                </p>
                <h3 className="font-serif text-[28px] leading-tight text-[var(--color-paper)] sm:text-[36px]">
                  {chapter.headline}
                </h3>
                <p className="max-w-md text-[16px] leading-relaxed text-[var(--color-paper)]/75">{chapter.body}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-paper)]/50">
                  {chapter.caption}
                </p>
              </div>
              <div className="rounded-[28px] border border-[var(--color-paper)]/10 bg-[var(--color-paper)]/5 p-4 sm:p-6">
                {reduce ? (
                  <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 text-[13px] text-[var(--color-ink-soft)]">
                    {chapter.body}
                  </div>
                ) : (
                  <div key={persona}>
                    <Demo />
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
