import type { BrunoMode } from './types';

export type BrunoProgressStepStatus =
  | 'pending'
  | 'active'
  | 'done'
  | 'error';

export type BrunoProgressStep = {
  id: string;
  label: string;
  detail?: string;
  status: BrunoProgressStepStatus;
};

export type BrunoProgressPayload = {
  phase: 'working' | 'complete';
  steps: BrunoProgressStep[];
  summary: string;
};

export const BRUNO_PROGRESS_STEP_IDS = {
  read: 'read',
  safety: 'safety',
  route: 'route',
  context: 'context',
  integrations: 'integrations',
  generate: 'generate',
} as const;

export type BrunoProgressStepId =
  (typeof BRUNO_PROGRESS_STEP_IDS)[keyof typeof BRUNO_PROGRESS_STEP_IDS];

const MODE_LABELS: Partial<Record<BrunoMode, string>> = {
  app_action: 'Planevo action',
  basic_chat: 'General chat',
  task_management: 'Task management',
  daily_planning: 'Daily planning',
  schedule_repair: 'Schedule repair',
  deadline_rescue: 'Deadline rescue',
  academic_tutoring: 'Academic tutoring',
  notes: 'Notes',
  document_writing: 'Document writing',
  project_breakdown: 'Project breakdown',
  coding_help: 'Coding help',
  emotional_recovery: 'Support',
  account_or_billing: 'Account help',
  unsafe: 'Safety check',
};

export function getBrunoModeLabel(mode: BrunoMode): string {
  return MODE_LABELS[mode] ?? 'Planning help';
}

/** Turns "LINEAR_CREATE_ISSUE" into "Linear · Create issue". */
export function humanizeBrunoToolName(toolName: string): string {
  const parts = toolName.split('_');
  if (parts.length <= 1) return toolName;
  const provider = parts[0];
  const action = parts
    .slice(1)
    .join(' ')
    .toLowerCase()
    .replace(/\b\w/, (c) => c.toUpperCase());
  const providerLabel =
    provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();
  return `${providerLabel} · ${action}`;
}

export function buildInitialProgressSteps(): BrunoProgressStep[] {
  return [
    { id: BRUNO_PROGRESS_STEP_IDS.read, label: 'Reading your message', status: 'active' },
    { id: BRUNO_PROGRESS_STEP_IDS.safety, label: 'Checking safety', status: 'pending' },
    { id: BRUNO_PROGRESS_STEP_IDS.route, label: 'Choosing how to help', status: 'pending' },
    { id: BRUNO_PROGRESS_STEP_IDS.context, label: 'Loading your planner context', status: 'pending' },
    { id: BRUNO_PROGRESS_STEP_IDS.generate, label: 'Writing response', status: 'pending' },
  ];
}

export function upsertProgressStep(
  steps: BrunoProgressStep[],
  step: BrunoProgressStep
): BrunoProgressStep[] {
  const index = steps.findIndex((s) => s.id === step.id);
  if (index === -1) return [...steps, step];
  const next = [...steps];
  next[index] = step;
  return next;
}

export function activateProgressStep(
  steps: BrunoProgressStep[],
  activeId: string
): BrunoProgressStep[] {
  return steps.map((step) => {
    if (step.id === activeId) {
      return { ...step, status: 'active' };
    }
    if (step.status === 'active') {
      return { ...step, status: 'done' };
    }
    return step;
  });
}

export function completeProgressStep(
  steps: BrunoProgressStep[],
  completedId: string,
  nextActiveId?: string
): BrunoProgressStep[] {
  let next = steps.map((step) =>
    step.id === completedId ? { ...step, status: 'done' as const } : step
  );
  if (nextActiveId) {
    next = activateProgressStep(next, nextActiveId);
  }
  return next;
}

export function deriveProgressSummary(
  steps: BrunoProgressStep[],
  phase: BrunoProgressPayload['phase']
): string {
  if (phase === 'complete') {
    return 'Done';
  }
  const active = steps.find((s) => s.status === 'active');
  if (active) return active.label;
  const pending = steps.find((s) => s.status === 'pending');
  if (pending) return pending.label;
  return 'Working on your request';
}

export function buildProgressPayload(
  steps: BrunoProgressStep[],
  phase: BrunoProgressPayload['phase'] = 'working'
): BrunoProgressPayload {
  return {
    phase,
    steps,
    summary: deriveProgressSummary(steps, phase),
  };
}
