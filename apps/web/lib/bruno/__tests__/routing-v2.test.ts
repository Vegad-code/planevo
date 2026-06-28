import { describe, expect, it } from 'vitest';
import { detectAppAction } from '@/lib/bruno/detectAppAction';
import { detectObviousMode } from '@/lib/bruno/detectObviousMode';
import {
  BRUNO_DOCUMENTS_OUTPUT_TOKENS,
  BRUNO_MODELS,
  MODEL_POLICY,
  resolveBrunoGenerationPlan,
} from '@/lib/bruno/modelPolicy';
import { estimateModelCostCents } from '@/lib/bruno/costEstimator';
import { checkDeterministicBrunoSafety } from '@/lib/bruno/safety';
import { hasDetectorEvasionRequest } from '@/lib/bruno/conversationRouting';

describe('Bruno V2 deterministic routing', () => {
  it.each([
    'Move math homework to tomorrow',
    'Mark my essay done',
    'Add a task called study AP Macro',
    'What is next?',
  ])('recognizes app action: %s', (message) => {
    expect(detectAppAction(message)).toBe(true);
    expect(detectObviousMode(message)?.mode).toBe('app_action');
  });

  it.each([
    ['Plan my afternoon', 'daily_planning'],
    ['I got behind. Fix the rest of my day.', 'schedule_repair'],
    ['I have three missing assignments and two tests. Fix my week.', 'deadline_rescue'],
    ['Teach me AP Macro Unit 1 and quiz me', 'academic_tutoring'],
    ['Make notes for AP Biology unit 1', 'notes'],
    ['Write me a five paragraph essay about Macbeth', 'document_writing'],
    ['Draft a cover letter for a summer internship', 'document_writing'],
    ['Write a report about renewable energy', 'document_writing'],
    ['Compose an email asking my teacher for an extension', 'document_writing'],
    ['Write my intro for this history paper', 'document_writing'],
    ['Make my essay undetectable by AI detectors', 'document_writing'],
    ['Help me wire Supabase auth into this API route', 'coding_help'],
    ['Can you code me a whole website then', 'coding_help'],
    ['Break down my research paper into steps for the next two weeks', 'project_breakdown'],
    ['I wasted the whole day and feel behind', 'emotional_recovery'],
    ['How many Deep Bruno requests do I have?', 'account_or_billing'],
  ] as const)('routes %s to %s', (message, expectedMode) => {
    expect(detectObviousMode(message)?.mode).toBe(expectedMode);
  });

  it.each([
    'Please synthesize a cohesive operational timeline for my mundane domestic chores',
    'Can you analyze my grocery list and evaluate what I should buy first?',
    'Strategically optimize my bedroom cleaning sequence',
  ])('does not classify fancy wording as deep: %s', (message) => {
    const mode = detectObviousMode(message)?.mode;
    expect(['task_management', 'daily_planning', undefined]).toContain(mode);
  });

  it('detects AI-detector evasion as a deterministic safety boundary', () => {
    expect(
      hasDetectorEvasionRequest(
        'Make my essay impossible to detect with GPTZero and no watermark'
      )
    ).toBe(true);
  });
});

describe('Bruno V2 model policy', () => {
  const freeNoCredits = {
    isPro: false,
    onboardingDeepCreditsRemaining: 0,
    earnedDeepCreditsRemaining: 0,
    monthlyDeepRequestsRemaining: 0,
    monthlyAiBudgetCentsRemaining: null,
    abuseScore: 0,
  };

  it('keeps app actions on the Standard model without an LLM router', () => {
    expect(MODEL_POLICY.app_action.tier).toBe('standard');
    expect(MODEL_POLICY.app_action.includeTasks).toBe(true);
  });

  it('keeps the existing Bruno model defaults unchanged', () => {
    expect(BRUNO_MODELS.ROUTER).toBe('gpt-5.4-nano');
    expect(BRUNO_MODELS.STANDARD).toBe('gpt-4o-mini');
    expect(BRUNO_MODELS.MEDIUM).toBe('gpt-5.4-nano');
    expect(BRUNO_MODELS.DEEP).toBe('gpt-5.4-mini');
  });

  it('uses a free onboarding credit for an eligible deep request', () => {
    const result = resolveBrunoGenerationPlan({
      decision: {
        mode: 'academic_tutoring',
        confidence: 0.9,
        needsCalendarContext: false,
        needsTaskContext: false,
        needsCanvasContext: true,
        estimatedOutputSize: 'long',
        upgradeMoment: true,
        rationale: 'academic multi-step tutoring',
      },
      entitlement: {
        ...freeNoCredits,
        onboardingDeepCreditsRemaining: 1,
      },
    });

    expect(result.tier).toBe('deep');
    expect(result.shouldReserveDeepAccess).toBe(true);
    expect(result.deepAccessSource).toBe('onboarding_credit');
    expect(result.shouldShowUpgradeCard).toBe(false);
  });

  it('falls back to Standard with an upgrade card when free credits are exhausted', () => {
    const result = resolveBrunoGenerationPlan({
      decision: {
        mode: 'deadline_rescue',
        confidence: 0.9,
        needsCalendarContext: true,
        needsTaskContext: true,
        needsCanvasContext: true,
        estimatedOutputSize: 'long',
        upgradeMoment: true,
        rationale: 'deadline rescue with multi-day planning',
      },
      entitlement: freeNoCredits,
    });

    expect(result.tier).toBe('standard');
    expect(result.shouldReserveDeepAccess).toBe(false);
    expect(result.shouldShowUpgradeCard).toBe(true);
    expect(result.policy.maxOutputTokens).toBeLessThanOrEqual(800);
    expect(result.policy.includeCanvas).toBe(false);
  });

  it('keeps coding help on Standard with a small output cap', () => {
    const result = resolveBrunoGenerationPlan({
      decision: {
        mode: 'coding_help',
        confidence: 0.9,
        needsCalendarContext: false,
        needsTaskContext: false,
        needsCanvasContext: false,
        estimatedOutputSize: 'medium',
        upgradeMoment: false,
        rationale: 'coding boundary request',
      },
      entitlement: {
        ...freeNoCredits,
        isPro: true,
        monthlyDeepRequestsRemaining: 30,
      },
    });

    expect(result.tier).toBe('standard');
    expect(result.shouldReserveDeepAccess).toBe(false);
    expect(result.shouldShowUpgradeCard).toBe(false);
    expect(result.policy.maxOutputTokens).toBe(700);
  });

  it('uses Standard document writing for free and existing Deep tier for Pro', () => {
    const decision = {
      mode: 'document_writing' as const,
      confidence: 0.9,
      needsCalendarContext: false,
      needsTaskContext: false,
      needsCanvasContext: true,
      estimatedOutputSize: 'long' as const,
      upgradeMoment: false,
      rationale: 'document writing request',
    };

    const free = resolveBrunoGenerationPlan({
      decision,
      entitlement: freeNoCredits,
    });
    expect(free.tier).toBe('standard');
    expect(free.model).toBe(BRUNO_MODELS.STANDARD);
    expect(free.policy.maxOutputTokens).toBe(
      BRUNO_DOCUMENTS_OUTPUT_TOKENS.free
    );

    const pro = resolveBrunoGenerationPlan({
      decision,
      entitlement: {
        ...freeNoCredits,
        isPro: true,
        monthlyDeepRequestsRemaining: 30,
      },
    });
    expect(pro.tier).toBe('deep');
    expect(pro.model).toBe(BRUNO_MODELS.DEEP);
    expect(pro.shouldReserveDeepAccess).toBe(false);
    expect(pro.policy.maxOutputTokens).toBe(
      BRUNO_DOCUMENTS_OUTPUT_TOKENS.pro
    );
  });

  it('warns Pro at 120 and falls back at the 150 request cap', () => {
    const decision = {
      mode: 'deadline_rescue' as const,
      confidence: 0.9,
      needsCalendarContext: true,
      needsTaskContext: true,
      needsCanvasContext: true,
      estimatedOutputSize: 'long' as const,
      upgradeMoment: true,
      rationale: 'deadline rescue request',
    };

    const warning = resolveBrunoGenerationPlan({
      decision,
      entitlement: {
        ...freeNoCredits,
        isPro: true,
        monthlyDeepRequestsRemaining: 30,
      },
    });
    expect(warning.tier).toBe('deep');
    expect(warning.shouldShowProWarning).toBe(true);

    const capped = resolveBrunoGenerationPlan({
      decision,
      entitlement: {
        ...freeNoCredits,
        isPro: true,
        monthlyDeepRequestsRemaining: 0,
      },
    });
    expect(capped.tier).toBe('standard');
    expect(capped.shouldShowProCap).toBe(true);
  });
});

describe('Bruno V2 safety and cost controls', () => {
  it('routes explicit self-harm language to a crisis response before normal routing', () => {
    const result = checkDeterministicBrunoSafety(
      'I am going to kill myself tonight and I have a plan'
    );
    expect(result.status).toBe('crisis');
  });

  it('does not treat ordinary overwhelm as a crisis', () => {
    const result = checkDeterministicBrunoSafety(
      'I feel overwhelmed and cannot start my homework'
    );
    expect(result.status).toBe('clear');
  });

  it('returns null for unknown model pricing instead of pretending it is free', () => {
    expect(
      estimateModelCostCents('unknown-model', {
        inputTokens: 1000,
        outputTokens: 500,
      })
    ).toBeNull();
  });

  it('estimates current GPT-5.4 mini token cost', () => {
    expect(
      estimateModelCostCents('gpt-5.4-mini', {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      })
    ).toBeCloseTo(525);
  });
});
