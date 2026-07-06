import { ScrollReveal } from '../motion/ScrollReveal';
import { BrunoSkillsGrid } from '../demo/BrunoSkillsGrid';
import { BrunoDemoTabs } from '../demo/BrunoDemoTabs';

/**
 * How Bruno can help — agent skills, portrait, and tabbed demos (action + reflection).
 * Bruno stays an assistant inside Planevo, not the product itself.
 */
export function BrunoSection() {
  return (
    <section id="bruno" className="scroll-mt-24 px-6 py-16 sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 sm:gap-16">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--color-ink-faint)]">
            How Bruno can help · Your AI companion
          </p>
          <h2 className="font-serif text-[36px] leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-[52px]">
            Ask in plain language. Bruno handles the rest.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--color-ink-soft)]">
            Planevo has a real AI inside. Bruno adapts to planning, tasks, and reflection
            &mdash; and always proposes changes for you to confirm before anything happens.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <BrunoSkillsGrid />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <BrunoDemoTabs />
        </ScrollReveal>
      </div>
    </section>
  );
}
