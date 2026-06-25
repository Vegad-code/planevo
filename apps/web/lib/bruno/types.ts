export type BrunoContextSource =
  | 'sidebar'
  | 'dashboard'
  | 'daily-plan'
  | 'tasks'
  | 'calendar'
  | 'settings'
  | 'unknown';

export interface BrunoPageContext {
  source?: BrunoContextSource;
  page?: string;
  label?: string;
  payload?: Record<string, unknown>;
}

export interface BrunoContextValue {
  isOpen: boolean;
  openBruno: (context?: BrunoPageContext) => void;
  closeBruno: () => void;
  toggleBruno: (context?: BrunoPageContext) => void;
  currentContext: BrunoPageContext | null;
  setCurrentContext: (context: BrunoPageContext) => void;
  activeThreadId: string | null;
  setActiveThreadId: (threadId: string | null) => void;
}

export type BrunoMode =
  | 'app_action'
  | 'basic_chat'
  | 'task_management'
  | 'daily_planning'
  | 'schedule_repair'
  | 'deadline_rescue'
  | 'academic_tutoring'
  | 'notes'
  | 'project_breakdown'
  | 'coding_help'
  | 'emotional_recovery'
  | 'account_or_billing'
  | 'unsafe';

export type BrunoRouteSource =
  | 'deterministic'
  | 'obvious_mode'
  | 'llm_router'
  | 'fallback';

export type BrunoRouteDecision = {
  mode: BrunoMode;
  confidence: number;
  needsCalendarContext: boolean;
  needsTaskContext: boolean;
  needsCanvasContext: boolean;
  estimatedOutputSize: 'short' | 'medium' | 'long';
  upgradeMoment: boolean;
  rationale: string;
};

export type ModelTier = 'none' | 'standard' | 'medium' | 'deep';

export type BrunoModelPolicy = {
  tier: ModelTier;
  proLocked: boolean;
  freeCreditsAllowed: boolean;
  includeTasks: boolean;
  includeCalendar: boolean;
  includeCanvas: boolean;
  maxOutputTokens: number;
  temperature: number;
  upgradeCardEligible: boolean;
};

export type BrunoEntitlement = {
  isPro: boolean;
  onboardingDeepCreditsRemaining: number;
  earnedDeepCreditsRemaining: number;
  monthlyDeepRequestsRemaining: number;
  monthlyAiBudgetCentsRemaining: number | null;
  abuseScore: number;
};

export type BrunoDeepAccessSource =
  | 'pro_monthly'
  | 'onboarding_credit'
  | 'earned_credit'
  | null;

export type BrunoGenerationPlan = {
  tier: ModelTier;
  model: string | null;
  shouldReserveDeepAccess: boolean;
  deepAccessSource: BrunoDeepAccessSource;
  shouldShowUpgradeCard: boolean;
  shouldShowProWarning: boolean;
  shouldShowProCap: boolean;
  policy: BrunoModelPolicy;
};

export type BrunoUpgradeCard = {
  type: 'bruno_upgrade_card';
  mode: BrunoMode;
  title: string;
  body: string;
  bullets: string[];
  ctaText: string;
  ctaHref: string;
};

export type BrunoProWarningNotice = {
  type: 'bruno_pro_warning';
  title: string;
  body: string;
  remaining: number;
};

export type BrunoProCapNotice = {
  type: 'bruno_pro_cap';
  title: string;
  body: string;
};

export type BrunoTruncatedNotice = {
  type: 'bruno_truncated';
  message: string;
  assistantText: string;
  canContinue: boolean;
};

import type { PlanType } from '@/lib/auth/plan-types';

export type BrunoRateLimitLimitType = 'daily' | 'hourly';

export type BrunoRateLimitPayload = {
  error: 'rate_limit_reached';
  limitType: BrunoRateLimitLimitType;
  message: string;
  used: number;
  limit: number;
  plan: PlanType;
  resetAt: string;
};

export type BrunoDataAccess = {
  tasks: boolean;
  calendar: boolean;
  canvas: boolean;
  integrations: boolean;
};

export const DEFAULT_BRUNO_DATA_ACCESS: BrunoDataAccess = {
  tasks: true,
  calendar: true,
  canvas: true,
  integrations: true,
};

export function parseBrunoDataAccess(
  preferences: Record<string, unknown> | null | undefined
): BrunoDataAccess {
  const prefs = preferences ?? {};
  return {
    tasks: prefs.bruno_access_tasks !== false,
    calendar: prefs.bruno_access_calendar !== false,
    canvas: prefs.bruno_access_canvas !== false,
    integrations: prefs.bruno_access_integrations !== false,
  };
}

import type { BrunoProgressPayload } from './bruno-progress';

export type BrunoDataParts = {
  'bruno-upgrade-card': BrunoUpgradeCard;
  'bruno-pro-warning': BrunoProWarningNotice;
  'bruno-pro-cap': BrunoProCapNotice;
  'bruno-progress': BrunoProgressPayload;
  'bruno-truncated': BrunoTruncatedNotice;
};
