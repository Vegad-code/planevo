import {
  EVENT_COLOR_PALETTE,
  DEFAULT_EVENT_COLOR,
} from '@/lib/calendar/eventColors';

/** Semantic categories Bruno can assign to multi-task batches */
export type ProposalColorCategory =
  | 'study'
  | 'exercise'
  | 'break'
  | 'admin'
  | 'work'
  | 'creative'
  | 'social'
  | 'health';

const CATEGORY_HEX: Record<ProposalColorCategory, string> = {
  study: '#3F51B5',
  exercise: '#33B679',
  break: '#F6BF26',
  admin: '#7986CB',
  work: '#616161',
  creative: '#8E24AA',
  social: '#E67C73',
  health: '#0B8043',
};

const CATEGORY_KEYWORDS: Array<{ category: ProposalColorCategory; pattern: RegExp }> = [
  { category: 'study', pattern: /\b(study|read|homework|exam|lecture|class|essay|quiz|review notes|problem set)\b/i },
  { category: 'exercise', pattern: /\b(workout|gym|run|exercise|walk|yoga|lift|cardio|stretch)\b/i },
  { category: 'break', pattern: /\b(break|rest|lunch|snack|nap|downtime|relax)\b/i },
  { category: 'admin', pattern: /\b(email|errand|admin|paperwork|forms|call|appointment|chore)\b/i },
  { category: 'work', pattern: /\b(work|meeting|standup|project|deadline|client|shift)\b/i },
  { category: 'creative', pattern: /\b(write|design|draft|brainstorm|create|build|code|paint)\b/i },
  { category: 'social', pattern: /\b(hangout|party|dinner|friends|family|date|call mom|call dad)\b/i },
  { category: 'health', pattern: /\b(doctor|therapy|medication|sleep|meditate|mindfulness|hydrate)\b/i },
];

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidProposalColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value);
}

export function paletteColorByIndex(index: number): string {
  const normalized = ((index % EVENT_COLOR_PALETTE.length) + EVENT_COLOR_PALETTE.length) % EVENT_COLOR_PALETTE.length;
  return EVENT_COLOR_PALETTE[normalized].hex;
}

export function inferColorCategory(text: string): ProposalColorCategory | null {
  for (const { category, pattern } of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category;
  }
  return null;
}

export function resolveCategoryColor(category: unknown): string | null {
  if (typeof category !== 'string') return null;
  const key = category.toLowerCase() as ProposalColorCategory;
  return CATEGORY_HEX[key] ?? null;
}

export interface ResolveProposalColorInput {
  color?: unknown;
  colorCategory?: unknown;
  title?: string;
  description?: string;
  batchIndex?: number;
}

/**
 * Pick a display color for a Bruno proposal.
 * Priority: explicit hex > semantic category > keyword inference > palette rotation.
 */
export function resolveProposalColor(input: ResolveProposalColorInput): string {
  if (isValidProposalColor(input.color)) {
    return input.color;
  }

  const categoryColor = resolveCategoryColor(input.colorCategory);
  if (categoryColor) return categoryColor;

  const combined = [input.title, input.description].filter(Boolean).join(' ');
  const inferred = combined ? inferColorCategory(combined) : null;
  if (inferred) return CATEGORY_HEX[inferred];

  if (typeof input.batchIndex === 'number') {
    return paletteColorByIndex(input.batchIndex);
  }

  return DEFAULT_EVENT_COLOR;
}

/** Assign distinct colors across a batch of proposals in one Bruno turn. */
export function assignColorsToProposalBatch<T extends Record<string, unknown>>(
  proposals: T[]
): Array<T & { payload: Record<string, unknown> }> {
  return proposals.map((proposal, index) => {
    const payload =
      typeof proposal.payload === 'object' && proposal.payload !== null
        ? (proposal.payload as Record<string, unknown>)
        : {};

    const color = resolveProposalColor({
      color: payload.color,
      colorCategory: payload.colorCategory,
      title: typeof proposal.title === 'string' ? proposal.title : undefined,
      description:
        typeof proposal.description === 'string' ? proposal.description : undefined,
      batchIndex: index,
    });

    return {
      ...proposal,
      payload: { ...payload, color },
    };
  });
}
