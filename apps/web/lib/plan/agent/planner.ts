import type {
  DailyPlanCandidateItem,
  DailyPlanDraftBlock,
  DailyPlanOverflowItem,
  DailyPlanPriority,
  DailyPlanSource,
  DailyPlanSourceInfluence,
  DeterministicDailyPlanResult,
  FixedScheduleBlock,
} from './types';

export interface BuildDeterministicDailyPlanInput {
  localDate: string;
  dayStart: string;
  dayEnd: string;
  now: string;
  candidates: DailyPlanCandidateItem[];
  fixedBlocks: FixedScheduleBlock[];
  preferredFocusWindow?: 'morning' | 'afternoon' | 'evening';
  bufferMinutes?: number;
}

interface ScoredCandidate {
  item: DailyPlanCandidateItem;
  score: number;
  factors: string[];
}

interface MutableGap {
  start: number;
  end: number;
  startsAfterFixed: boolean;
}

const PRIORITY_SCORE: Record<DailyPlanPriority, number> = {
  urgent: 35,
  high: 24,
  medium: 8,
  low: 2,
};

function minutesBetween(start: number, end: number): number {
  return Math.max(0, Math.round((end - start) / 60_000));
}

function addMinutes(timestamp: number, minutes: number): number {
  return timestamp + minutes * 60_000;
}

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function dateKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function daysUntil(dueAt: string | null, localDate: string): number | null {
  if (!dueAt) return null;
  const dueKey = dateKey(dueAt);
  if (!dueKey) return null;
  const due = new Date(`${dueKey}T00:00:00.000Z`).getTime();
  const base = new Date(`${localDate}T00:00:00.000Z`).getTime();
  return Math.round((due - base) / 86_400_000);
}

function scoreCandidate(
  item: DailyPlanCandidateItem,
  localDate: string,
  largestGapMinutes: number
): ScoredCandidate {
  let score = 0;
  const factors: string[] = [];
  const dueIn = daysUntil(item.dueAt, localDate);

  if (dueIn === 0) {
    score += 45;
    factors.push('due today');
  } else if (dueIn !== null && dueIn > 0 && dueIn <= 3) {
    score += 30;
    factors.push('due within 3 days');
  } else if (dueIn !== null && dueIn > 3 && dueIn <= 7) {
    score += 18;
    factors.push('due this week');
  }

  score += PRIORITY_SCORE[item.priority];
  if (item.priority === 'urgent') factors.push('urgent priority');
  if (item.priority === 'high') factors.push('high priority');
  if (item.priority === 'low') factors.push('low priority');

  if (item.source === 'linear' && (item.priority === 'urgent' || item.priority === 'high')) {
    score += 18;
    factors.push('engineering issue');
  }

  if (
    item.source === 'slack' &&
    (item.confidenceSignals.includes('direct_ask') || /\?/.test(item.title))
  ) {
    score += 10;
    factors.push('direct communication ask');
  }

  if (!item.dueAt) {
    score -= 8;
    factors.push('missing due date');
  }

  if (item.estimatedMinutes > largestGapMinutes) {
    score -= 20;
    factors.push('too large for current gaps');
  }

  return { item, score, factors };
}

function buildGaps(input: BuildDeterministicDailyPlanInput): {
  gaps: MutableGap[];
  fixedMinutes: number;
} {
  const dayStartMs = new Date(input.dayStart).getTime();
  const dayEndMs = new Date(input.dayEnd).getTime();
  const nowMs = new Date(input.now).getTime();
  const startMs = Math.max(dayStartMs, nowMs);

  const fixed = input.fixedBlocks
    .map((block) => ({
      start: Math.max(new Date(block.startTime).getTime(), startMs),
      end: Math.min(new Date(block.endTime).getTime(), dayEndMs),
    }))
    .filter((block) => Number.isFinite(block.start) && Number.isFinite(block.end) && block.end > startMs && block.start < dayEndMs)
    .sort((a, b) => a.start - b.start);

  const gaps: MutableGap[] = [];
  let cursor = startMs;
  let startsAfterFixed = false;
  let fixedMinutes = 0;

  for (const block of fixed) {
    if (block.start > cursor) {
      gaps.push({ start: cursor, end: block.start, startsAfterFixed });
      startsAfterFixed = false;
    }

    if (block.end > cursor) {
      fixedMinutes += minutesBetween(Math.max(block.start, cursor), block.end);
      cursor = block.end;
      startsAfterFixed = true;
    }
  }

  if (cursor < dayEndMs) {
    gaps.push({ start: cursor, end: dayEndMs, startsAfterFixed });
  }

  return { gaps, fixedMinutes };
}

function confidenceFromScore(score: number): number {
  return Math.max(35, Math.min(96, 54 + Math.round(score / 2)));
}

function buildReason(candidate: DailyPlanCandidateItem, factors: string[]): string {
  const primary = factors.find((factor) => factor !== 'missing due date') ?? 'available focus window';
  const sourceLabel = candidate.source === 'task'
    ? 'Planevo'
    : candidate.source === 'google_calendar'
      ? 'Google Calendar'
      : candidate.source.charAt(0).toUpperCase() + candidate.source.slice(1);

  return `${sourceLabel} item placed here because of ${primary}.`;
}

function sourceOrder(source: DailyPlanSource): number {
  return ['canvas', 'task', 'linear', 'notion', 'slack', 'google_calendar'].indexOf(source);
}

function buildSourceInfluence(
  candidates: DailyPlanCandidateItem[],
  blocks: DailyPlanDraftBlock[],
  overflow: DailyPlanOverflowItem[]
): DailyPlanSourceInfluence[] {
  const sources = new Set<DailyPlanSource>([
    ...candidates.map((item) => item.source),
    ...overflow.map((item) => item.source),
  ]);

  return Array.from(sources)
    .sort((a, b) => sourceOrder(a) - sourceOrder(b))
    .map((source) => ({
      source,
      totalCandidates: candidates.filter((item) => item.source === source).length,
      plannedCount: blocks.filter((block) => block.source === source).length,
      overflowCount: overflow.filter((item) => item.source === source).length,
    }));
}

export function buildDeterministicDailyPlan(
  input: BuildDeterministicDailyPlanInput
): DeterministicDailyPlanResult {
  const bufferMinutes = input.bufferMinutes ?? 10;
  const { gaps, fixedMinutes } = buildGaps(input);
  const largestGapMinutes = gaps.reduce(
    (largest, gap) => Math.max(largest, minutesBetween(gap.start, gap.end)),
    0
  );
  const scored = input.candidates
    .map((item) => scoreCandidate(item, input.localDate, largestGapMinutes))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dueA = a.item.dueAt ? new Date(a.item.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const dueB = b.item.dueAt ? new Date(b.item.dueAt).getTime() : Number.POSITIVE_INFINITY;
      if (dueA !== dueB) return dueA - dueB;
      return a.item.title.localeCompare(b.item.title);
    });

  const blocks: DailyPlanDraftBlock[] = [];
  const overflowItems: DailyPlanOverflowItem[] = [];

  for (const scoredCandidate of scored) {
    const { item, factors, score } = scoredCandidate;
    let placed = false;

    for (const gap of gaps) {
      if (placed) break;

      if (
        gap.startsAfterFixed &&
        bufferMinutes > 0 &&
        minutesBetween(gap.start, gap.end) >= item.estimatedMinutes + bufferMinutes
      ) {
        const bufferEnd = addMinutes(gap.start, bufferMinutes);
        blocks.push({
          candidateId: null,
          source: 'system',
          type: 'buffer',
          title: 'Meeting buffer',
          startTime: toIso(gap.start),
          endTime: toIso(bufferEnd),
          durationMinutes: bufferMinutes,
          reason: 'Protected transition time after a fixed calendar event.',
          confidence: 92,
          confidenceFactors: ['fixed event transition', 'protect focus'],
          constraintsUsed: ['fixed calendar event'],
          url: null,
        });
        gap.start = bufferEnd;
        gap.startsAfterFixed = false;
      }

      if (minutesBetween(gap.start, gap.end) < item.estimatedMinutes) {
        continue;
      }

      const end = addMinutes(gap.start, item.estimatedMinutes);
      blocks.push({
        candidateId: item.id,
        source: item.source,
        type: 'focus',
        title: item.title,
        startTime: toIso(gap.start),
        endTime: toIso(end),
        durationMinutes: item.estimatedMinutes,
        reason: buildReason(item, factors),
        confidence: confidenceFromScore(score),
        confidenceFactors: factors.length > 0 ? factors : ['fits available focus window'],
        constraintsUsed: ['calendar availability', ...item.confidenceSignals.slice(0, 4)],
        url: item.url,
      });
      gap.start = end;
      gap.startsAfterFixed = false;
      placed = true;
    }

    if (!placed) {
      overflowItems.push({
        candidateId: item.id,
        source: item.source,
        title: item.title,
        reason: `No open focus window could fit ${item.estimatedMinutes} minutes.`,
        score,
      });
    }
  }

  blocks.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const dayStartMs = new Date(input.dayStart).getTime();
  const dayEndMs = new Date(input.dayEnd).getTime();
  const totalMinutes = minutesBetween(dayStartMs, dayEndMs);
  const plannedFocusMinutes = blocks
    .filter((block) => block.type === 'focus')
    .reduce((total, block) => total + block.durationMinutes, 0);
  const plannedBufferMinutes = blocks
    .filter((block) => block.type === 'buffer')
    .reduce((total, block) => total + block.durationMinutes, 0);
  const availableFocusMinutes = Math.max(0, totalMinutes - fixedMinutes);
  const loadRatio = availableFocusMinutes > 0 ? plannedFocusMinutes / availableFocusMinutes : 1;
  const status = loadRatio > 1
    ? 'overloaded'
    : loadRatio >= 0.78 || overflowItems.length > 3
      ? 'tight'
      : 'healthy';

  return {
    blocks,
    overflowItems,
    capacity: {
      fixedMinutes,
      availableFocusMinutes,
      plannedFocusMinutes,
      bufferMinutes: plannedBufferMinutes,
      overflowCount: overflowItems.length,
      status,
    },
    sourceInfluence: buildSourceInfluence(input.candidates, blocks, overflowItems),
  };
}
