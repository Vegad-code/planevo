import type { BrunoAssistantMode, BrunoMode } from './types';

export const BRUNO_ASSISTANT_MODE_STORAGE_KEY = 'planevo-bruno-assistant-mode';

export const PLANNING_ESCALATION_MODES: ReadonlySet<BrunoMode> = new Set([
  'app_action',
  'daily_planning',
  'schedule_repair',
  'deadline_rescue',
  'project_breakdown',
  'task_management',
]);

export function resolveEffectiveAssistantMode(input: {
  assistantMode: BrunoAssistantMode;
  routeMode: BrunoMode;
}): BrunoAssistantMode {
  if (input.assistantMode === 'planning') {
    return 'planning';
  }

  if (PLANNING_ESCALATION_MODES.has(input.routeMode)) {
    return 'planning';
  }

  return 'general';
}

export function didAutoEscalateToPlanning(input: {
  assistantMode: BrunoAssistantMode;
  effectiveAssistantMode: BrunoAssistantMode;
}): boolean {
  return (
    input.assistantMode === 'general' &&
    input.effectiveAssistantMode === 'planning'
  );
}

export function usesMinimalGeneralPrompt(input: {
  effectiveAssistantMode: BrunoAssistantMode;
  routeMode: BrunoMode;
}): boolean {
  return (
    input.effectiveAssistantMode === 'general' && input.routeMode === 'basic_chat'
  );
}

export function parseBrunoAssistantMode(
  value: unknown
): BrunoAssistantMode {
  return value === 'planning' ? 'planning' : 'general';
}
