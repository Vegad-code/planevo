/**
 * Scripted demo data for the landing hero — the student scenario from
 * docs/superpowers/plans/comprehensive.md §9.1, typed against the real
 * Command contracts so the marketing demo can never drift from the product.
 *
 * Dates are computed relative to a `now` the caller provides (day-granular,
 * midnight-anchored) so due labels always read "Tomorrow" / weekday names.
 */

import type {
  CommandBoard,
  ExtractedResponsibility,
  ResponsibilityItem,
  ResponsibilityPriority,
  ResponsibilitySourceType,
  ResponsibilityType,
} from '@/lib/command/types';
import type { PreviewDraft } from '@/components/command/CommandPreviewPanel';

export const DUMP_TEXT =
  "I have a bio lab report due Friday, algebra quiz tomorrow, English essay next week, soccer practice every day at 4, and I need to ask my teacher about missing work. Also I promised my mom I'd clean my room before Saturday.";

export const PREVIEW_SUMMARY =
  'Found 6 responsibilities — 2 with deadlines this week.';

function dayOffset(now: Date, days: number): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

interface DraftSeed {
  title: string;
  type: ResponsibilityType;
  priority: ResponsibilityPriority;
  dueOffsetDays: number | null;
  dueText: string | null;
  recurrenceRule: string | null;
  needsReview: boolean;
  reviewReason: string | null;
}

const DRAFT_SEEDS: DraftSeed[] = [
  {
    title: 'Study for algebra quiz',
    type: 'assessment',
    priority: 'urgent',
    dueOffsetDays: 1,
    dueText: 'tomorrow',
    recurrenceRule: null,
    needsReview: false,
    reviewReason: null,
  },
  {
    title: 'Bio lab report',
    type: 'assignment',
    priority: 'high',
    dueOffsetDays: 3,
    dueText: 'Friday',
    recurrenceRule: null,
    needsReview: false,
    reviewReason: null,
  },
  {
    title: 'English essay',
    type: 'assignment',
    priority: 'normal',
    dueOffsetDays: 8,
    dueText: 'next week',
    recurrenceRule: null,
    needsReview: true,
    reviewReason: 'Which day next week?',
  },
  {
    title: 'Soccer practice',
    type: 'practice',
    priority: 'normal',
    dueOffsetDays: null,
    dueText: 'every day at 4',
    recurrenceRule: 'FREQ=DAILY;BYHOUR=16',
    needsReview: false,
    reviewReason: null,
  },
  {
    title: 'Ask teacher about missing work',
    type: 'follow_up',
    priority: 'high',
    dueOffsetDays: null,
    dueText: null,
    recurrenceRule: null,
    needsReview: false,
    reviewReason: null,
  },
  {
    title: 'Clean room',
    type: 'errand',
    priority: 'normal',
    dueOffsetDays: 2,
    dueText: 'before Saturday',
    recurrenceRule: null,
    needsReview: false,
    reviewReason: null,
  },
];

export function makePreviewDrafts(now: Date): PreviewDraft[] {
  return DRAFT_SEEDS.map((seed) => ({
    title: seed.title,
    description: null,
    type: seed.type,
    dueText: seed.dueText,
    dueAt: seed.dueOffsetDays === null ? null : dayOffset(now, seed.dueOffsetDays),
    startAt: null,
    endAt: null,
    timezone: null,
    recurrenceRule: seed.recurrenceRule,
    priority: seed.priority,
    confidence: seed.needsReview ? 0.62 : 0.93,
    needsReview: seed.needsReview,
    reviewReason: seed.reviewReason,
    whyItMatters: null,
    sourceHints: [],
    accepted: true,
  }));
}

/** Kept for parity with the API contract shape used elsewhere. */
export function makeExtracted(now: Date): ExtractedResponsibility[] {
  return makePreviewDrafts(now).map(({ accepted: _accepted, ...rest }) => rest);
}

interface BoardSeed {
  id: string;
  title: string;
  type: ResponsibilityType;
  priority: ResponsibilityPriority;
  dueOffsetDays: number | null;
  sourceType: ResponsibilitySourceType;
}

function makeItem(now: Date, seed: BoardSeed): ResponsibilityItem {
  const created = dayOffset(now, 0);
  return {
    id: seed.id,
    title: seed.title,
    description: null,
    type: seed.type,
    status: 'active',
    priority: seed.priority,
    urgencyScore: seed.priority === 'urgent' ? 0.95 : seed.priority === 'high' ? 0.75 : 0.4,
    confidence: 0.93,
    dueAt: seed.dueOffsetDays === null ? null : dayOffset(now, seed.dueOffsetDays),
    startAt: null,
    endAt: null,
    timezone: null,
    recurrenceRule: null,
    sourceType: seed.sourceType,
    sourceLabel: null,
    sourceItemId: null,
    calendarEventId: null,
    taskId: null,
    intakeRunId: 'demo-intake',
    needsReview: false,
    reviewReason: null,
    whyItMatters: null,
    metadata: {},
    completedAt: null,
    createdAt: created,
    updatedAt: created,
  };
}

export function makeBoardFixture(now: Date): CommandBoard {
  return {
    now: [
      makeItem(now, {
        id: 'demo-1',
        title: 'Ask teacher about missing work',
        type: 'follow_up',
        priority: 'high',
        dueOffsetDays: null,
        sourceType: 'voice',
      }),
      makeItem(now, {
        id: 'demo-2',
        title: 'Study for algebra quiz',
        type: 'assessment',
        priority: 'urgent',
        dueOffsetDays: 1,
        sourceType: 'voice',
      }),
    ],
    today: [
      makeItem(now, {
        id: 'demo-3',
        title: 'Soccer practice · 4:00 PM',
        type: 'practice',
        priority: 'normal',
        dueOffsetDays: null,
        sourceType: 'voice',
      }),
      makeItem(now, {
        id: 'demo-4',
        title: 'Start bio lab outline',
        type: 'assignment',
        priority: 'high',
        dueOffsetDays: null,
        sourceType: 'manual',
      }),
    ],
    dueSoon: [
      makeItem(now, {
        id: 'demo-5',
        title: 'Bio lab report',
        type: 'assignment',
        priority: 'high',
        dueOffsetDays: 3,
        sourceType: 'voice',
      }),
      makeItem(now, {
        id: 'demo-6',
        title: 'English essay draft',
        type: 'assignment',
        priority: 'normal',
        dueOffsetDays: 8,
        sourceType: 'voice',
      }),
    ],
    onMyPlate: [
      makeItem(now, {
        id: 'demo-7',
        title: 'Clean room',
        type: 'errand',
        priority: 'normal',
        dueOffsetDays: 2,
        sourceType: 'voice',
      }),
    ],
    unsorted: [],
    waiting: [],
    done: [],
  };
}

/** Clean-output ribbon rows shown while the board/plan states play. */
export const CLEAN_RIBBON_ROWS = [
  'Bio lab report · Fri',
  'Algebra quiz · Tomorrow',
  'Ask teacher · Now',
  'Clean room · Sat',
];

/** Rambling gray dump text for the messy SVG ribbon. */
export const MESSY_RIBBON_TEXT =
  "...honestly the bio lab is due Friday and there's an algebra quiz tomorrow and soccer runs every day at 4 and I still haven't asked about the missing work and mom wants the room clean before Saturday and I don't even know where to start...";

export const LANDING_TASKS = [
  { title: 'Bio lab report', due: 'Fri', done: false },
  { title: 'Algebra quiz review', due: 'Tomorrow', done: false },
  { title: 'Email teacher about missing work', due: 'Today', done: false },
  { title: 'Read ch. 4 for English', due: 'Done', done: true },
] as const;

export const LANDING_CALENDAR_EVENTS = [
  { time: '10:00', title: 'Chemistry lecture', color: '#5B8DCF' },
  { time: '14:00', title: 'Soccer practice', color: '#C56B5E' },
  { time: '16:30', title: 'Bio lab report block', color: '#F4A62A' },
] as const;

export const LANDING_NOTES = [
  { notebook: 'Biology', title: 'Lab report outline', active: true, preview: 'Hypothesis: enzyme activity increases with temperature up to 37°C. Methods from Tuesday lab — remember to cite the control group results.' },
  { notebook: 'Algebra', title: 'Quiz formulas', active: false, preview: '' },
  { notebook: 'English', title: 'Essay thesis', active: false, preview: '' },
] as const;
