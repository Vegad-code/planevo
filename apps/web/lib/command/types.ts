/**
 * Planevo Command — domain types.
 *
 * Source of truth: docs/superpowers/plans/comprehensive.md §17.
 * The database enum keeps all 16 responsibility types as stable vocabulary;
 * the launch extraction prompt and UI use only the 8-type subset (§10.5).
 */

export type ResponsibilityType =
  | 'assignment'
  | 'assessment'
  | 'meeting'
  | 'class'
  | 'practice'
  | 'work_deadline'
  | 'follow_up'
  | 'errand'
  | 'family'
  | 'money'
  | 'health'
  | 'creative'
  | 'idea'
  | 'habit_like_routine'
  | 'admin'
  | 'unknown';

/** The 8-type launch subset (§10.5) used by extraction prompts and the UI. */
export const LAUNCH_RESPONSIBILITY_TYPES = [
  'assignment',
  'assessment',
  'meeting',
  'class',
  'follow_up',
  'errand',
  'admin',
  'unknown',
] as const satisfies readonly ResponsibilityType[];

export type LaunchResponsibilityType = (typeof LAUNCH_RESPONSIBILITY_TYPES)[number];

/** Lifecycle only — board sections are always computed, never stored (§16.3, §21). */
export type ResponsibilityStatus =
  | 'active'
  | 'waiting'
  | 'done'
  | 'archived'
  | 'discarded';

export type ResponsibilityPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ResponsibilitySourceType =
  | 'manual'
  | 'voice'
  | 'paste'
  | 'calendar'
  | 'canvas'
  | 'slack'
  | 'notion'
  | 'linear'
  | 'email_later'
  | 'share_sheet_later'
  | 'ocr_later';

export type CommandInputMode =
  | 'text'
  | 'paste'
  | 'voice'
  | 'source_import'
  | 'share_sheet'
  | 'ocr';

export type CommandIntakeStatus =
  | 'pending'
  | 'previewed'
  | 'confirmed'
  | 'discarded'
  | 'failed';

export interface ResponsibilityItem {
  id: string;
  title: string;
  description: string | null;
  type: ResponsibilityType;
  status: ResponsibilityStatus;
  priority: ResponsibilityPriority;
  urgencyScore: number;
  confidence: number;
  dueAt: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string | null;
  recurrenceRule: string | null;
  sourceType: ResponsibilitySourceType;
  sourceLabel: string | null;
  sourceItemId: string | null;
  calendarEventId: string | null;
  taskId: string | null;
  intakeRunId: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  whyItMatters: string | null;
  metadata: Record<string, unknown>;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CommandBoardSection =
  | 'now'
  | 'today'
  | 'dueSoon'
  | 'onMyPlate'
  | 'unsorted'
  | 'waiting'
  | 'done';

export interface CommandBoard {
  now: ResponsibilityItem[];
  today: ResponsibilityItem[];
  dueSoon: ResponsibilityItem[];
  onMyPlate: ResponsibilityItem[];
  unsorted: ResponsibilityItem[];
  waiting: ResponsibilityItem[];
  done: ResponsibilityItem[];
}

export interface CommandBoardSummary {
  nowCount: number;
  todayCount: number;
  dueSoonCount: number;
  unsortedCount: number;
}

/** Bruno context contract (§11.4) — compact by design; never the whole life history. */
export interface CommandBrunoContext {
  surface: 'command';
  selectedItemId?: string;
  boardSnapshot: CommandBoardSummary;
  selectedItem?: {
    id: string;
    title: string;
    type: ResponsibilityType;
    dueAt: string | null;
    sourceType: ResponsibilitySourceType;
    status: ResponsibilityStatus;
    notes: string | null;
  };
}

// ---------------------------------------------------------------------------
// API contracts (§20)
// ---------------------------------------------------------------------------

export interface CommandIntakeRequest {
  inputMode: 'text' | 'paste' | 'source_import';
  text: string;
  timezone: string;
  clientNow: string;
  sourceIds?: string[];
}

export interface ExtractedResponsibility {
  title: string;
  description: string | null;
  type: ResponsibilityType;
  dueText: string | null;
  dueAt: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string | null;
  recurrenceRule: string | null;
  priority: ResponsibilityPriority;
  confidence: number;
  needsReview: boolean;
  reviewReason: string | null;
  whyItMatters: string | null;
  sourceHints: string[];
}

export interface CommandIntakeResponse {
  intakeRunId: string;
  summary: string;
  previewItems: ExtractedResponsibility[];
  clarificationQuestions: string[];
  usage: {
    planType: string;
    remainingToday: number;
    estimatedCostUsd: number;
  };
}

export interface CommandConfirmRequest {
  intakeRunId: string;
  items: Array<{
    title: string;
    description: string | null;
    type: ResponsibilityType;
    dueAt: string | null;
    startAt: string | null;
    endAt: string | null;
    priority: ResponsibilityPriority;
    whyItMatters: string | null;
    accepted: boolean;
  }>;
}

export interface CommandConfirmResponse {
  createdItemIds: string[];
  board: CommandBoard;
}
