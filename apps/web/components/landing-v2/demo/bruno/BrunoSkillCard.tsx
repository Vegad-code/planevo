'use client';

import {
  CalendarCheck,
  ArrowsClockwise,
  ListChecks,
  CheckSquare,
  Heart,
  NotePencil,
  Plugs,
  Lock,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LinearIcon, NotionIcon, SlackIcon } from '@/components/icons/BrandIcons';
import type { BrunoSkillKey } from './types';
import { cn } from '@/lib/utils';

const INTEGRATION_LOGOS: Array<{
  key: string;
  Icon: typeof NotionIcon;
  className?: string;
}> = [
  { key: 'notion', Icon: NotionIcon, className: 'text-[var(--color-ink)]' },
  { key: 'slack', Icon: SlackIcon },
  { key: 'linear', Icon: LinearIcon },
];

export const PRO_SKILL_KEY: BrunoSkillKey = 'integrations';

export const SKILL_ICONS: Record<BrunoSkillKey, Icon> = {
  daily_planning: CalendarCheck,
  schedule_repair: ArrowsClockwise,
  project_breakdown: ListChecks,
  task_management: CheckSquare,
  emotional_recovery: Heart,
  notes: NotePencil,
  integrations: Plugs,
};

export const SKILL_CAPTIONS: Partial<Record<BrunoSkillKey, string>> = {
  daily_planning: 'Real gaps · real focus blocks',
  schedule_repair: 'Re-reads · reshuffles · recovers',
  project_breakdown: 'Big work → schedulable steps',
  task_management: 'Create · move · prioritize',
  emotional_recovery: 'Thoughtful · grounded · no platitudes',
  notes: 'Capture · draft · save',
  integrations: 'Notion · Slack · Linear',
};

export interface BrunoSkillCardData {
  key: BrunoSkillKey;
  label: string;
  description: string;
  pro?: boolean;
}

interface BrunoSkillCardProps {
  skill: BrunoSkillCardData;
  isActive?: boolean;
  compact?: boolean;
  showPulse?: boolean;
  showProSpotlight?: boolean;
  dimmed?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export const BrunoSkillCard = forwardRef<HTMLButtonElement, BrunoSkillCardProps>(
  function BrunoSkillCard(
    {
      skill,
      isActive = false,
      compact = false,
      showPulse = false,
      showProSpotlight = false,
      dimmed = false,
      className,
      onClick,
      onKeyDown,
    },
    ref,
  ) {
    const SkillIcon = SKILL_ICONS[skill.key];
    const reduce = useReducedMotion();
    const isPro = Boolean(skill.pro);

    const CardTag = showProSpotlight && !reduce ? motion.button : 'button';
    const spotlightProps =
      showProSpotlight && !reduce
        ? {
            animate: { scale: [1, 1.14, 1.06] },
            transition: { duration: 0.85, times: [0, 0.55, 1], ease: 'easeOut' as const },
          }
        : {};

    return (
      <CardTag
        ref={ref}
        type="button"
        data-skill-key={skill.key}
        onClick={onClick}
        onKeyDown={onKeyDown}
        aria-pressed={isActive}
        aria-label={`${skill.label}: ${skill.description}${isPro ? ' — Pro feature' : ''}`}
        {...spotlightProps}
        className={cn(
          'group relative flex flex-col gap-2 rounded-2xl border text-left backdrop-blur-md transition-[colors,transform,opacity,box-shadow] duration-200',
          'shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.22)]',
          compact ? 'min-w-[200px] shrink-0 snap-center p-3' : isPro ? 'w-[184px] p-4' : 'w-[168px] p-4',
          isPro
            ? 'border-transparent bg-gradient-to-br from-[var(--color-paper)]/78 to-[var(--color-honey-soft)]/55 bruno-pro-glow hover:scale-[1.05] hover:from-[var(--color-paper)]/86 hover:to-[var(--color-honey-soft)]/62'
            : 'border-[var(--color-line)]/60 bg-[var(--color-paper)]/72 hover:scale-[1.03] hover:border-[var(--color-honey)]/70 hover:bg-[var(--color-paper)]/84 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]',
          isActive && 'border-[var(--color-honey)]/80 bg-[var(--color-paper)]/86 shadow-md',
          !isPro && !isActive && 'border-[var(--color-line)]/60',
          dimmed && 'pointer-events-none scale-95 opacity-40',
          showPulse && 'ring-2 ring-[var(--color-honey)] ring-offset-2 ring-offset-[var(--color-charcoal)]',
          className,
        )}
      >
        {isPro && (
          <span
            aria-hidden
            className="bruno-pro-border pointer-events-none absolute -inset-px rounded-2xl"
          />
        )}
        {showPulse && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-ping rounded-2xl border-2 border-[var(--color-honey)] opacity-40"
          />
        )}
        <span className="relative flex items-center justify-between gap-2">
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur-sm',
              isPro
                ? 'bg-[var(--color-honey)]/90 text-[var(--color-paper)]'
                : 'bg-[var(--color-honey-soft)]/85 text-[var(--color-honey-deep)]',
            )}
          >
            <SkillIcon size={20} weight="bold" />
          </span>
          {isPro && (
            <span className="flex items-center gap-0.5 rounded-full border border-[var(--color-honey)]/70 bg-[var(--color-paper)]/80 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-wider text-[var(--color-honey-deep)] shadow-sm backdrop-blur-sm">
              <Lock size={8} weight="bold" />
              Pro
            </span>
          )}
        </span>
        <span
          className={cn(
            'relative font-semibold leading-snug text-[var(--color-ink)]',
            compact ? 'text-[13px]' : 'text-[14px]',
          )}
        >
          {skill.label}
        </span>
        {!compact && (
          <span
            className={cn(
              'relative text-[12px] leading-snug',
              isPro ? 'text-[var(--color-honey-deep)]' : 'text-[var(--color-ink-soft)]',
            )}
          >
            {skill.description}
          </span>
        )}
        {isPro && !compact && (
          <span className="relative flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {INTEGRATION_LOGOS.map(({ key, Icon, className }) => (
              <span
                key={key}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-paper)]/85 shadow-sm backdrop-blur-sm"
              >
                <Icon className={cn('h-2.5 w-2.5', className)} aria-hidden />
              </span>
            ))}
          </span>
        )}
      </CardTag>
    );
  },
);
