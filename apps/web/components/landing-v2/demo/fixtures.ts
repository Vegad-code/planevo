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

/** Per-pill color tones for the hero vacuum stream. */
export const HERO_PILL_TONES = {
  sage: { bg: 'var(--color-sage-soft)', dot: 'var(--color-sage)', border: 'var(--color-sage)' },
  rose: { bg: 'var(--color-rose-soft)', dot: 'var(--color-rose)', border: 'var(--color-rose)' },
  ice: { bg: 'var(--color-blue-soft)', dot: 'var(--color-blue)', border: 'var(--color-blue)' },
  ocean: { bg: 'var(--color-ocean-soft)', dot: 'var(--color-ocean)', border: 'var(--color-ocean)' },
  coral: { bg: '#FDE8E0', dot: 'var(--color-note-coral)', border: 'var(--color-note-coral)' },
} as const;

export type HeroPillTone = keyof typeof HERO_PILL_TONES;

/** Hero time-stream: scattered life tasks that vacuum into left/right track stacks on scroll. */
export const HERO_TIMELINE_TASKS = [
  {
    id: 'groceries',
    label: 'Groceries',
    meta: '',
    track: 'left' as const,
    order: 0,
    tone: 'sage' as const,
    rotate: -10,
    startX: -380,
    startY: -260,
    scatterX: -78,
    depositY: 430,
    delay: 0,
  },
  {
    id: 'gym',
    label: 'Gym',
    meta: '7AM',
    track: 'left' as const,
    order: 1,
    tone: 'ice' as const,
    rotate: 5,
    startX: -340,
    startY: 40,
    scatterX: -62,
    depositY: 460,
    delay: 0.08,
  },
  {
    id: 'call-mom',
    label: 'Call mom',
    meta: '',
    track: 'left' as const,
    order: 2,
    tone: 'rose' as const,
    rotate: -6,
    startX: -360,
    startY: 220,
    scatterX: -70,
    depositY: 490,
    delay: 0.16,
  },
  {
    id: 'meal-prep',
    label: 'Meal prep',
    meta: '',
    track: 'left' as const,
    order: 3,
    tone: 'coral' as const,
    rotate: 8,
    startX: -120,
    startY: -300,
    scatterX: -48,
    depositY: 515,
    delay: 0.12,
  },
  {
    id: 'rent',
    label: 'Pay rent',
    meta: 'Fri',
    track: 'right' as const,
    order: 0,
    tone: 'rose' as const,
    rotate: 9,
    startX: 370,
    startY: -270,
    scatterX: 76,
    depositY: 435,
    delay: 0.04,
  },
  {
    id: 'project',
    label: 'Project deadline',
    meta: '',
    track: 'right' as const,
    order: 1,
    tone: 'ocean' as const,
    rotate: -7,
    startX: 350,
    startY: 60,
    scatterX: 64,
    depositY: 465,
    delay: 0.1,
  },
  {
    id: 'dentist',
    label: 'Dentist',
    meta: 'Tue',
    track: 'right' as const,
    order: 2,
    tone: 'ice' as const,
    rotate: 6,
    startX: 390,
    startY: 210,
    scatterX: 82,
    depositY: 495,
    delay: 0.18,
  },
  {
    id: 'birthday',
    label: 'Birthday gift',
    meta: '',
    track: 'right' as const,
    order: 3,
    tone: 'sage' as const,
    rotate: -8,
    startX: 140,
    startY: -290,
    scatterX: 50,
    depositY: 520,
    delay: 0.14,
  },
] as const;

export type HeroTimelineTask = (typeof HERO_TIMELINE_TASKS)[number];

/** Wispr-style hero bubble: short messy → clean snippet pairs. Shuffled at runtime. */
export const HERO_CHAOS_SNIPPETS = [
  {
    messy: 'Um… soccer at 4, bio lab Friday, and I still haven\u2019t emailed my teacher?',
    clean: 'Soccer 4PM · Bio lab Fri · Email teacher today.',
  },
  {
    messy: 'Like… groceries, gym, call mom — my week\u2019s just kind of everywhere.',
    clean: 'Groceries · Gym · Call mom — one calm plan.',
  },
  {
    messy: 'Honestly rent\u2019s due Friday and I don\u2019t even know where to start…',
    clean: 'Pay rent Fri — slotted around your real availability.',
  },
  {
    messy: 'Wait, dentist Tuesday? And the group project? And I work Thursday night…',
    clean: 'Dentist Tue · Group project · Shift Thu — all in place.',
  },
  {
    messy: 'I have three deadlines this week and no idea which one is first, help.',
    clean: '3 deadlines, sorted by what\u2019s actually due first.',
  },
  {
    messy: 'Okay so… laundry, meal prep, study for the quiz, and somehow sleep?',
    clean: 'Laundry · Meal prep · Quiz review — with time to rest.',
  },
  {
    messy: 'My calendar changed again and now everything I planned is kind of wrong.',
    clean: 'Plans shifted? Planevo re-fit your whole day.',
  },
  {
    messy: 'Practice moved to 6, dinner with friends, and a paper due at midnight ugh.',
    clean: 'Practice 6PM · Dinner · Paper by 12 — handled.',
  },
] as const;

/** @deprecated Use HERO_CHAOS_SNIPPETS */
export const HERO_MESSY_DUMP = HERO_CHAOS_SNIPPETS[0].messy;

/** @deprecated Use HERO_CHAOS_SNIPPETS */
export const HERO_CLEAN_PLAN = HERO_CHAOS_SNIPPETS[0].clean;

/** Footer task-flow loop pills — varied student/life struggles (avoid hero staples). */
export const FOOTER_FLOW_TASKS = [
  { label: 'Bio exam', meta: 'Thu' },
  { label: 'Internship app', meta: 'due' },
  { label: 'Office hours', meta: '2PM' },
  { label: 'Group project', meta: 'sync' },
  { label: 'Schedule conflict' },
  { label: 'TA email', meta: 'reply' },
  { label: 'Study group', meta: 'library' },
] as const;

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
