import {
  GraduationCap,
  ListChecks,
  CalendarBlank,
  Notebook,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { Eyebrow } from '../Eyebrow';
import { ScrollReveal } from '../motion/ScrollReveal';

const CELLS: Array<{
  id: string;
  icon: Icon;
  title: string;
  body: string;
  rows: Array<{ label: string; meta: string }>;
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
        <div className="grid gap-5 sm:grid-cols-2">
          {CELLS.map(({ id, icon: CellIcon, title, body, rows }) => (
            <div
              key={id}
              className="flex flex-col gap-4 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)]">
                <CellIcon size={22} weight="duotone" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-serif text-[22px] leading-snug tracking-tight text-[var(--color-ink)]">
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
              </div>
              <div className="mt-auto flex flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-1">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] py-2.5 last:border-b-0"
                  >
                    <span className="truncate text-[14px] text-[var(--color-ink)]">{row.label}</span>
                    <span className="flex-none text-[12px] tabular-nums text-[var(--color-ink-soft)]">
                      {row.meta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
