import Image from 'next/image';
import {
  CalendarCheck,
  ArrowsClockwise,
  ListChecks,
  CheckSquare,
  Heart,
  NotePencil,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';

const SKILLS: {
  key: string;
  label: string;
  description: string;
  icon: Icon;
}[] = [
  {
    key: 'daily_planning',
    label: 'Plan your day',
    description: 'Finds real gaps in your calendar and blocks focus time',
    icon: CalendarCheck,
  },
  {
    key: 'schedule_repair',
    label: 'Fix a messy week',
    description: 'Re-reads your calendar when plans fall apart',
    icon: ArrowsClockwise,
  },
  {
    key: 'project_breakdown',
    label: 'Break down big work',
    description: 'Turns assignments into schedulable steps',
    icon: ListChecks,
  },
  {
    key: 'task_management',
    label: 'Manage tasks',
    description: 'Create, move, and prioritize without leaving chat',
    icon: CheckSquare,
  },
  {
    key: 'emotional_recovery',
    label: 'Reflect & recenter',
    description: 'Grounded support when you\u2019re overwhelmed \u2014 no lecture',
    icon: Heart,
  },
  {
    key: 'notes',
    label: 'Notes & writing',
    description: 'Capture ideas and draft what you\u2019ve been putting off',
    icon: NotePencil,
  },
];

/**
 * Agent skills row — maps Bruno routing modes to student-friendly labels.
 */
export function BrunoSkillsGrid() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-12">
      <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[32px] border border-[var(--color-line)] bg-[linear-gradient(180deg,#F4EDD9_0%,#FFFDF5_100%)] p-5 shadow-lg">
        <Image
          src="/landing/bruno-portrait.png"
          alt="Bruno, the Planevo bear"
          width={512}
          height={512}
          className="mx-auto w-full rounded-2xl"
          priority={false}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        {SKILLS.map(({ key, label, description, icon: SkillIcon }) => (
          <div
            key={key}
            className="group flex flex-col gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 transition-colors hover:border-[var(--color-honey)] hover:bg-[var(--color-surface-muted)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)] transition-colors group-hover:bg-[var(--color-honey)]/20">
              <SkillIcon size={20} weight="bold" />
            </span>
            <span className="text-[14px] font-semibold leading-snug text-[var(--color-ink)]">
              {label}
            </span>
            <span className="text-[12px] leading-snug text-[var(--color-ink-soft)]">
              {description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
