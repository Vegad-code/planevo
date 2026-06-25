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
    { id: 'read', label: 'Reading your message', status: 'active' },
    { id: 'safety', label: 'Checking safety', status: 'pending' },
    { id: 'route', label: 'Choosing how to help', status: 'pending' },
    { id: 'context', label: 'Loading your planner context', status: 'pending' },
    { id: 'generate', label: 'Writing response', status: 'pending' },
  ];
}

export function buildProgressPayload(
  steps: BrunoProgressStep[],
  phase: BrunoProgressPayload['phase'] = 'working'
): BrunoProgressPayload {
  const active = steps.find((s) => s.status === 'active');
  const pending = steps.find((s) => s.status === 'pending');
  const summary =
    phase === 'complete'
      ? 'Done'
      : active?.label ?? pending?.label ?? 'Working on your request';

  return { phase, steps, summary };
}
