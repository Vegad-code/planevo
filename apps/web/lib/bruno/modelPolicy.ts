import type {
  BrunoEntitlement,
  BrunoGenerationPlan,
  BrunoModelPolicy,
  BrunoRouteDecision,
} from './types';

export const BRUNO_MODELS = {
  ROUTER: process.env.BRUNO_ROUTER_MODEL ?? 'gpt-5.4-nano',
  STANDARD: process.env.BRUNO_STANDARD_MODEL ?? 'gpt-4o-mini',
  MEDIUM: process.env.BRUNO_MEDIUM_MODEL ?? 'gpt-5.4-nano',
  DEEP: process.env.BRUNO_DEEP_MODEL ?? 'gpt-5.4-mini',
} as const;

export const BRUNO_PRO_MONTHLY_DEEP_LIMIT = 150;
export const BRUNO_PRO_DEEP_WARNING_AT = 120;

export const BRUNO_NOTES_FREE_MONTHLY_LIMIT = Number(
  process.env.BRUNO_NOTES_FREE_MONTHLY_LIMIT ?? 8
);

export const BRUNO_NOTES_OUTPUT_TOKENS = {
  free: 2500,
  pro: 4500,
} as const;

export const MODEL_POLICY: Record<
  BrunoRouteDecision['mode'],
  BrunoModelPolicy
> = {
  app_action: {
    tier: 'standard',
    proLocked: false,
    freeCreditsAllowed: false,
    includeTasks: true,
    includeCalendar: false,
    includeCanvas: false,
    maxOutputTokens: 400,
    temperature: 0.2,
    upgradeCardEligible: false,
  },
  basic_chat: {
    tier: 'standard',
    proLocked: false,
    freeCreditsAllowed: false,
    includeTasks: false,
    includeCalendar: false,
    includeCanvas: false,
    maxOutputTokens: 500,
    temperature: 0.6,
    upgradeCardEligible: false,
  },
  task_management: {
    tier: 'standard',
    proLocked: false,
    freeCreditsAllowed: false,
    includeTasks: true,
    includeCalendar: false,
    includeCanvas: false,
    maxOutputTokens: 700,
    temperature: 0.35,
    upgradeCardEligible: false,
  },
  daily_planning: {
    tier: 'standard',
    proLocked: false,
    freeCreditsAllowed: false,
    includeTasks: true,
    includeCalendar: true,
    includeCanvas: false,
    maxOutputTokens: 900,
    temperature: 0.35,
    upgradeCardEligible: false,
  },
  schedule_repair: {
    tier: 'medium',
    proLocked: false,
    freeCreditsAllowed: false,
    includeTasks: true,
    includeCalendar: true,
    includeCanvas: false,
    maxOutputTokens: 1000,
    temperature: 0.35,
    upgradeCardEligible: true,
  },
  deadline_rescue: {
    tier: 'deep',
    proLocked: true,
    freeCreditsAllowed: true,
    includeTasks: true,
    includeCalendar: true,
    includeCanvas: true,
    maxOutputTokens: 1600,
    temperature: 0.25,
    upgradeCardEligible: true,
  },
  academic_tutoring: {
    tier: 'deep',
    proLocked: true,
    freeCreditsAllowed: true,
    includeTasks: false,
    includeCalendar: false,
    includeCanvas: true,
    maxOutputTokens: 4500,
    temperature: 0.25,
    upgradeCardEligible: true,
  },
  notes: {
    tier: 'standard',
    proLocked: false,
    freeCreditsAllowed: false,
    includeTasks: false,
    includeCalendar: false,
    includeCanvas: true,
    maxOutputTokens: BRUNO_NOTES_OUTPUT_TOKENS.free,
    temperature: 0.25,
    upgradeCardEligible: false,
  },
  project_breakdown: {
    tier: 'deep',
    proLocked: true,
    freeCreditsAllowed: true,
    includeTasks: true,
    includeCalendar: true,
    includeCanvas: true,
    maxOutputTokens: 1800,
    temperature: 0.3,
    upgradeCardEligible: true,
  },
  coding_help: {
    tier: 'deep',
    proLocked: true,
    freeCreditsAllowed: true,
    includeTasks: false,
    includeCalendar: false,
    includeCanvas: false,
    maxOutputTokens: 2000,
    temperature: 0.2,
    upgradeCardEligible: true,
  },
  emotional_recovery: {
    tier: 'medium',
    proLocked: false,
    freeCreditsAllowed: false,
    includeTasks: true,
    includeCalendar: true,
    includeCanvas: false,
    maxOutputTokens: 900,
    temperature: 0.45,
    upgradeCardEligible: false,
  },
  account_or_billing: {
    tier: 'standard',
    proLocked: false,
    freeCreditsAllowed: false,
    includeTasks: false,
    includeCalendar: false,
    includeCanvas: false,
    maxOutputTokens: 500,
    temperature: 0.2,
    upgradeCardEligible: false,
  },
  unsafe: {
    tier: 'none',
    proLocked: false,
    freeCreditsAllowed: false,
    includeTasks: false,
    includeCalendar: false,
    includeCanvas: false,
    maxOutputTokens: 500,
    temperature: 0.2,
    upgradeCardEligible: false,
  },
};

function modelForTier(tier: BrunoGenerationPlan['tier']) {
  if (tier === 'deep') return BRUNO_MODELS.DEEP;
  if (tier === 'medium') return BRUNO_MODELS.MEDIUM;
  if (tier === 'standard') return BRUNO_MODELS.STANDARD;
  return null;
}

export function resolveBrunoGenerationPlan(input: {
  decision: BrunoRouteDecision;
  entitlement: BrunoEntitlement;
}): BrunoGenerationPlan {
  const policy = MODEL_POLICY[input.decision.mode];

  if (input.decision.mode === 'notes') {
    if (input.entitlement.isPro) {
      return {
        tier: 'deep',
        model: BRUNO_MODELS.DEEP,
        shouldReserveDeepAccess: false,
        deepAccessSource: null,
        shouldShowUpgradeCard: false,
        shouldShowProWarning: false,
        shouldShowProCap: false,
        policy: {
          ...policy,
          tier: 'deep',
          maxOutputTokens: BRUNO_NOTES_OUTPUT_TOKENS.pro,
        },
      };
    }

    return {
      tier: 'standard',
      model: BRUNO_MODELS.STANDARD,
      shouldReserveDeepAccess: false,
      deepAccessSource: null,
      shouldShowUpgradeCard: false,
      shouldShowProWarning: false,
      shouldShowProCap: false,
      policy: {
        ...policy,
        maxOutputTokens: BRUNO_NOTES_OUTPUT_TOKENS.free,
      },
    };
  }

  if (policy.tier === 'none') {
    return {
      tier: 'none',
      model: null,
      shouldReserveDeepAccess: false,
      deepAccessSource: null,
      shouldShowUpgradeCard: false,
      shouldShowProWarning: false,
      shouldShowProCap: false,
      policy,
    };
  }

  if (policy.tier !== 'deep') {
    return {
      tier: policy.tier,
      model: modelForTier(policy.tier),
      shouldReserveDeepAccess: false,
      deepAccessSource: null,
      shouldShowUpgradeCard: false,
      shouldShowProWarning: false,
      shouldShowProCap: false,
      policy,
    };
  }

  if (input.entitlement.isPro) {
    const usedThisMonth =
      BRUNO_PRO_MONTHLY_DEEP_LIMIT -
      input.entitlement.monthlyDeepRequestsRemaining;
    const isCapped = input.entitlement.monthlyDeepRequestsRemaining <= 0;

    if (!isCapped) {
      return {
        tier: 'deep',
        model: BRUNO_MODELS.DEEP,
        shouldReserveDeepAccess: true,
        deepAccessSource: 'pro_monthly',
        shouldShowUpgradeCard: false,
        shouldShowProWarning: usedThisMonth >= BRUNO_PRO_DEEP_WARNING_AT,
        shouldShowProCap: false,
        policy,
      };
    }

    return {
      tier: 'standard',
      model: BRUNO_MODELS.STANDARD,
      shouldReserveDeepAccess: false,
      deepAccessSource: null,
      shouldShowUpgradeCard: false,
      shouldShowProWarning: false,
      shouldShowProCap: true,
      policy: {
        ...policy,
        maxOutputTokens: Math.min(policy.maxOutputTokens, 800),
        includeCanvas: false,
      },
    };
  }

  if (
    policy.freeCreditsAllowed &&
    input.entitlement.onboardingDeepCreditsRemaining > 0
  ) {
    return {
      tier: 'deep',
      model: BRUNO_MODELS.DEEP,
      shouldReserveDeepAccess: true,
      deepAccessSource: 'onboarding_credit',
      shouldShowUpgradeCard: false,
      shouldShowProWarning: false,
      shouldShowProCap: false,
      policy,
    };
  }

  if (
    policy.freeCreditsAllowed &&
    input.entitlement.earnedDeepCreditsRemaining > 0
  ) {
    return {
      tier: 'deep',
      model: BRUNO_MODELS.DEEP,
      shouldReserveDeepAccess: true,
      deepAccessSource: 'earned_credit',
      shouldShowUpgradeCard: false,
      shouldShowProWarning: false,
      shouldShowProCap: false,
      policy,
    };
  }

  return {
    tier: 'standard',
    model: BRUNO_MODELS.STANDARD,
    shouldReserveDeepAccess: false,
    deepAccessSource: null,
    shouldShowUpgradeCard: policy.upgradeCardEligible,
    shouldShowProWarning: false,
    shouldShowProCap: false,
    policy: {
      ...policy,
      maxOutputTokens: Math.min(policy.maxOutputTokens, 800),
      includeCanvas: false,
    },
  };
}
