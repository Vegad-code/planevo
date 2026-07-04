export type DailyPlanSource =
  | 'task'
  | 'canvas'
  | 'google_calendar'
  | 'notion'
  | 'slack'
  | 'linear';

export type DailyPlanPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DailyPlanCapacityStatus = 'healthy' | 'tight' | 'overloaded';

export interface DailyPlanCandidateItem {
  id: string;
  rawSourceId: string | null;
  source: DailyPlanSource;
  title: string;
  description: string | null;
  dueAt: string | null;
  startAt: string | null;
  endAt: string | null;
  estimatedMinutes: number;
  priority: DailyPlanPriority;
  status: string | null;
  url: string | null;
  confidenceSignals: string[];
}

export interface FixedScheduleBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  source: DailyPlanSource | 'manual' | 'schedule' | string | null;
}

export interface DailyPlanDraftBlock {
  candidateId: string | null;
  source: DailyPlanSource | 'system';
  type: 'focus' | 'buffer';
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reason: string;
  confidence: number;
  confidenceFactors: string[];
  constraintsUsed: string[];
  url: string | null;
}

export interface DailyPlanOverflowItem {
  candidateId: string;
  source: DailyPlanSource;
  title: string;
  reason: string;
  score: number;
}

export interface DailyPlanCapacity {
  fixedMinutes: number;
  availableFocusMinutes: number;
  plannedFocusMinutes: number;
  bufferMinutes: number;
  overflowCount: number;
  status: DailyPlanCapacityStatus;
}

export interface DailyPlanSourceInfluence {
  source: DailyPlanSource;
  totalCandidates: number;
  plannedCount: number;
  overflowCount: number;
}

export interface DeterministicDailyPlanResult {
  blocks: DailyPlanDraftBlock[];
  overflowItems: DailyPlanOverflowItem[];
  capacity: DailyPlanCapacity;
  sourceInfluence: DailyPlanSourceInfluence[];
}
