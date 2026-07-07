import type { ComponentType } from 'react';
import {
  CanvasIcon,
  GoogleIcon,
  LinearIcon,
  NotionIcon,
  SlackIcon,
} from '@/components/icons/BrandIcons';
import { cn } from '@/lib/utils';
import { EditorialSection } from '../editorial/EditorialSection';
import { LogoMarquee } from '../editorial/LogoMarquee';

const INTEGRATIONS: Array<{
  name: string;
  Icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
}> = [
  { name: 'Canvas', Icon: CanvasIcon },
  { name: 'Google Calendar', Icon: GoogleIcon },
  { name: 'Notion', Icon: NotionIcon, iconClassName: 'text-[var(--color-paper)]' },
  { name: 'Slack', Icon: SlackIcon },
  { name: 'Linear', Icon: LinearIcon },
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
          items={INTEGRATIONS.map(({ name, Icon, iconClassName }) => (
            <span key={name} className="flex items-center gap-2">
              <Icon className={cn('h-5 w-5', iconClassName)} aria-hidden />
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
