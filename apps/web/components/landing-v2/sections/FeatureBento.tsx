import {
  GraduationCap,
  ListChecks,
  CalendarBlank,
  Notebook,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { Eyebrow } from '../Eyebrow';
import { FloatingUiCard } from '../editorial/FloatingUiCard';
import { ScrollReveal } from '../motion/ScrollReveal';

const CELLS: Array<{
  id: string;
  icon: Icon;
  title: string;
  body: string;
  rows: Array<{ label: string; meta: string }>;
  offset?: string;
}> = [
  {
    id: 'sources',
    icon: GraduationCap,
    title: 'Canvas deadlines land by themselves',
    body: 'Connect once. Assignments flow onto your board with dates attached.',
    rows: [
      { label: 'Bio lab report', meta: 'Fri' },
      { label: 'Problem set 4', meta: 'Mon' },
    ],
    offset: 'lg:translate-y-8',
  },
  {
    id: 'tasks',
    icon: ListChecks,
    title: 'A backlog that stays honest',
    body: 'Overdue work quietly rolls forward instead of piling up.',
    rows: [
      { label: 'Algebra quiz review', meta: 'Today' },
      { label: 'English essay draft', meta: 'Jul 14' },
    ],
    offset: 'lg:-translate-y-4',
  },
  {
    id: 'calendar',
    icon: CalendarBlank,
    title: 'The whole week at once',
    body: 'Google Calendar syncs in. Planevo never schedules over it.',
    rows: [
      { label: 'Chemistry lecture', meta: '10:00' },
      { label: 'Soccer practice', meta: '16:00' },
    ],
    offset: 'lg:translate-y-4',
  },
  {
    id: 'notes',
    icon: Notebook,
    title: 'Notes tied to your day',
    body: 'Notebooks next to your tasks — flashcards in a tap.',
    rows: [
      { label: 'Lab report outline', meta: 'Linked · Thu' },
      { label: 'Key facts → flashcards', meta: '12 cards' },
    ],
    offset: 'lg:-translate-y-6',
  },
];

export function FeatureBento() {
  return (
    <section id="everything-else" className="scroll-mt-24 px-6 py-16 sm:py-24">
      <ScrollReveal className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Eyebrow>And everything around it</Eyebrow>
          <h2 className="font-serif text-[36px] leading-[1.08] tracking-tight text-[var(--color-ink)] sm:text-[44px]">
            The rest of your system, built in.
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {CELLS.map(({ id, icon: CellIcon, title, body, rows, offset }, i) => (
            <div key={id} className={offset}>
              <FloatingUiCard variant="dark" rotate={i % 2 === 0 ? -0.5 : 0.5}>
                <div className="flex flex-col gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-ocean-soft)] text-[var(--color-ocean)]">
                    <CellIcon size={22} weight="duotone" />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-serif text-[22px] leading-snug tracking-tight text-[var(--color-paper)]">
                      {title}
                    </h3>
                    <p className="text-[14px] leading-relaxed text-[var(--color-paper)]/70">{body}</p>
                  </div>
                  <ul className="flex flex-col gap-2 border-t border-[var(--color-paper)]/10 pt-4">
                    {rows.map((row) => (
                      <li
                        key={row.label}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-paper)]/8 px-3 py-2 text-[13px] text-[var(--color-paper)]/90"
                      >
                        <span>{row.label}</span>
                        <span className="text-[var(--color-paper)]/55">{row.meta}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FloatingUiCard>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
