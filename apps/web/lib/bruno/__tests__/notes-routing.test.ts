import { describe, expect, it } from 'vitest';
import {
  detectNotesIntent,
  isNotesRefinementMessage,
  shouldStickToNotesMode,
} from '@/lib/bruno/conversationRouting';
import { resolveBrunoGenerationPlan } from '@/lib/bruno/modelPolicy';

describe('Bruno notes routing helpers', () => {
  it.each([
    'Make notes for AP Biology unit 1',
    'Write handwriteable notes for my chem test',
    'Create a review sheet for history',
  ])('detects notes intent: %s', (message) => {
    expect(detectNotesIntent(message)).toBe(true);
  });

  it.each([
    'more detailed please',
    'continue',
    'add a section on steroids',
  ])('detects refinement follow-ups: %s', (message) => {
    expect(isNotesRefinementMessage(message)).toBe(true);
  });

  it('sticks to notes mode on refinement after notes', () => {
    expect(
      shouldStickToNotesMode({
        message: 'more detailed',
        lastMode: 'notes',
      })
    ).toBe(true);
  });

  it('gives free users standard model with higher token budget for notes', () => {
    const result = resolveBrunoGenerationPlan({
      decision: {
        mode: 'notes',
        confidence: 0.9,
        needsCalendarContext: false,
        needsTaskContext: false,
        needsCanvasContext: true,
        estimatedOutputSize: 'long',
        upgradeMoment: false,
        rationale: 'notes',
      },
      entitlement: {
        isPro: false,
        onboardingDeepCreditsRemaining: 0,
        earnedDeepCreditsRemaining: 0,
        monthlyDeepRequestsRemaining: 0,
        monthlyAiBudgetCentsRemaining: null,
        abuseScore: 0,
      },
    });

    expect(result.tier).toBe('standard');
    expect(result.shouldReserveDeepAccess).toBe(false);
    expect(result.policy.maxOutputTokens).toBe(2500);
  });

  it('gives Pro users deep model for notes without deep credit reservation', () => {
    const result = resolveBrunoGenerationPlan({
      decision: {
        mode: 'notes',
        confidence: 0.9,
        needsCalendarContext: false,
        needsTaskContext: false,
        needsCanvasContext: true,
        estimatedOutputSize: 'long',
        upgradeMoment: false,
        rationale: 'notes',
      },
      entitlement: {
        isPro: true,
        onboardingDeepCreditsRemaining: 0,
        earnedDeepCreditsRemaining: 0,
        monthlyDeepRequestsRemaining: 100,
        monthlyAiBudgetCentsRemaining: null,
        abuseScore: 0,
      },
    });

    expect(result.tier).toBe('deep');
    expect(result.shouldReserveDeepAccess).toBe(false);
    expect(result.policy.maxOutputTokens).toBe(4500);
  });
});
