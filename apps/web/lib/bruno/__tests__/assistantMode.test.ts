import { describe, expect, it } from 'vitest';
import {
  didAutoEscalateToPlanning,
  parseBrunoAssistantMode,
  PLANNING_ESCALATION_MODES,
  resolveEffectiveAssistantMode,
  usesMinimalGeneralPrompt,
} from '@/lib/bruno/assistantMode';

describe('parseBrunoAssistantMode', () => {
  it('defaults unknown values to general', () => {
    expect(parseBrunoAssistantMode(undefined)).toBe('general');
    expect(parseBrunoAssistantMode('general')).toBe('general');
    expect(parseBrunoAssistantMode('planning')).toBe('planning');
    expect(parseBrunoAssistantMode('other')).toBe('general');
  });
});

describe('resolveEffectiveAssistantMode', () => {
  it('keeps explicit planning mode', () => {
    expect(
      resolveEffectiveAssistantMode({
        assistantMode: 'planning',
        routeMode: 'basic_chat',
      })
    ).toBe('planning');
  });

  it('auto-escalates planning-related router modes from general', () => {
    for (const mode of PLANNING_ESCALATION_MODES) {
      expect(
        resolveEffectiveAssistantMode({
          assistantMode: 'general',
          routeMode: mode,
        })
      ).toBe('planning');
    }
  });

  it('stays general for basic chat', () => {
    expect(
      resolveEffectiveAssistantMode({
        assistantMode: 'general',
        routeMode: 'basic_chat',
      })
    ).toBe('general');
  });
});

describe('didAutoEscalateToPlanning', () => {
  it('detects auto escalation', () => {
    expect(
      didAutoEscalateToPlanning({
        assistantMode: 'general',
        effectiveAssistantMode: 'planning',
      })
    ).toBe(true);
    expect(
      didAutoEscalateToPlanning({
        assistantMode: 'planning',
        effectiveAssistantMode: 'planning',
      })
    ).toBe(false);
  });
});

describe('usesMinimalGeneralPrompt', () => {
  it('is true only for general basic chat', () => {
    expect(
      usesMinimalGeneralPrompt({
        effectiveAssistantMode: 'general',
        routeMode: 'basic_chat',
      })
    ).toBe(true);
    expect(
      usesMinimalGeneralPrompt({
        effectiveAssistantMode: 'planning',
        routeMode: 'basic_chat',
      })
    ).toBe(false);
    expect(
      usesMinimalGeneralPrompt({
        effectiveAssistantMode: 'general',
        routeMode: 'academic_tutoring',
      })
    ).toBe(false);
    expect(
      usesMinimalGeneralPrompt({
        effectiveAssistantMode: 'general',
        routeMode: 'basic_chat',
        routeHasContextSignal: true,
      })
    ).toBe(false);
  });
});
