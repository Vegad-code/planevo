import {
  GraduationCap,
  CalendarBlank,
  Cube,
  ChatCircle,
  LineSegments,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';

const INTEGRATIONS: Array<{ name: string; icon: Icon }> = [
  { name: 'Canvas', icon: GraduationCap },
  { name: 'Google Calendar', icon: CalendarBlank },
  { name: 'Notion', icon: Cube },
  { name: 'Slack', icon: ChatCircle },
  { name: 'Linear', icon: LineSegments },
];

export function ProofStrip() {
  return (
    <section aria-label="Works with your tools" className="px-6 pb-16 sm:pb-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {INTEGRATIONS.map(({ name, icon: BrandIcon }) => (
            <li
              key={name}
              className="flex items-center gap-2 text-[15px] font-medium text-[var(--color-ink-soft)]"
            >
              <BrandIcon size={20} weight="duotone" aria-hidden />
              {name}
            </li>
          ))}
        </ul>
        <p className="text-center text-[14px] text-[var(--color-ink-soft)]">
          Deadlines sync in by themselves — and Planevo never schedules over
          something already on your calendar.
        </p>
      </div>
    </section>
  );
}
