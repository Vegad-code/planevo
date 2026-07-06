import {
  GraduationCap,
  CalendarBlank,
  Cube,
  ChatCircle,
  LineSegments,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { EditorialSection } from '../editorial/EditorialSection';
import { LogoMarquee } from '../editorial/LogoMarquee';

const INTEGRATIONS: Array<{ name: string; icon: Icon }> = [
  { name: 'Canvas', icon: GraduationCap },
  { name: 'Google Calendar', icon: CalendarBlank },
  { name: 'Notion', icon: Cube },
  { name: 'Slack', icon: ChatCircle },
  { name: 'Linear', icon: LineSegments },
];

export function ProofStrip() {
  return (
    <EditorialSection tone="forest" bleed className="py-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6">
        <p className="text-center text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-paper)]/80">
          Works with the tools you already use
        </p>
        <LogoMarquee
          className="w-full"
          items={INTEGRATIONS.map(({ name, icon: BrandIcon }) => (
            <span key={name} className="flex items-center gap-2">
              <BrandIcon size={20} weight="duotone" aria-hidden />
              <span className="text-[15px] font-medium text-[var(--color-paper)]">{name}</span>
            </span>
          ))}
        />
        <p className="max-w-xl text-center text-[14px] text-[var(--color-paper)]/75">
          Deadlines sync in by themselves — and Planevo never schedules over
          something already on your calendar.
        </p>
      </div>
    </EditorialSection>
  );
}
