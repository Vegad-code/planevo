'use client';

import type { BrunoSkillKey } from './types';
import { BrunoChapterTrustInView } from './BrunoChapterTrust';
import { BrunoChapterCanvasInView } from './BrunoChapterCanvas';
import { BrunoChapterDayRepairInView } from './BrunoChapterDayRepair';
import { BrunoBreakdownDemo } from './BrunoBreakdownDemo';
import { BrunoTaskDemo } from './BrunoTaskDemo';
import { BrunoNotesDemo } from './BrunoNotesDemo';
import { BrunoIntegrationsDemo } from './BrunoIntegrationsDemo';
import { BrunoReflectionDemo } from '../BrunoReflectionDemo';
import { PlanMyDayTimeline } from '../PlanMyDayTimeline';

interface BrunoScenarioPanelProps {
  skill: BrunoSkillKey;
}

export function BrunoScenarioPanel({ skill }: BrunoScenarioPanelProps) {
  switch (skill) {
    case 'daily_planning':
      return (
        <div className="mx-auto max-w-sm" aria-hidden>
          <PlanMyDayTimeline trigger="inView" />
        </div>
      );
    case 'schedule_repair':
      return <BrunoChapterDayRepairInView />;
    case 'project_breakdown':
      return <BrunoBreakdownDemo />;
    case 'task_management':
      return <BrunoTaskDemo />;
    case 'emotional_recovery':
      return <BrunoReflectionDemo />;
    case 'notes':
      return <BrunoNotesDemo />;
    case 'integrations':
      return <BrunoIntegrationsDemo />;
    default: {
      const _exhaustive: never = skill;
      return _exhaustive;
    }
  }
}

export const SCROLL_CHAPTER_DEMOS = [
  BrunoChapterTrustInView,
  BrunoChapterCanvasInView,
  BrunoChapterDayRepairInView,
] as const;
