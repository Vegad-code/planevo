'use client';

import { useBruno } from '@/components/bruno/BrunoProvider';

interface SuggestedAction {
  label: string;
  prompt: string;
}

const ACTIONS: Record<string, SuggestedAction[]> = {
  dashboard: [
    {
      label: 'Review my week',
      prompt: 'Review my week and tell me what I should focus on first.',
    },
    {
      label: 'Find my riskiest day',
      prompt:
        'Look at my current Planevo context and help me identify the riskiest day or biggest planning problem this week.',
    },
    {
      label: 'What should I do first?',
      prompt:
        'Based on where I am in Planevo, help me decide what I should do first.',
    },
  ],
  'daily-plan': [
    {
      label: "I'm behind",
      prompt:
        "I'm behind on my daily plan. Help me recover the rest of today without making the plan feel overwhelming.",
    },
    {
      label: 'Rebuild today',
      prompt:
        "Help me rebuild today's plan into a realistic version I can still finish.",
    },
    {
      label: 'Make this lighter',
      prompt:
        "Make today's plan feel lighter and more realistic while keeping the most important work protected.",
    },
  ],
  tasks: [
    {
      label: 'Prioritize tasks',
      prompt: 'Help me prioritize my tasks by urgency, importance, and effort.',
    },
    {
      label: 'Break this down',
      prompt:
        'Help me break down my current task list into smaller next actions.',
    },
    {
      label: 'Estimate time',
      prompt:
        'Help me estimate how long my tasks might take and identify what is too vague.',
    },
  ],
  calendar: [
    {
      label: 'Find study time',
      prompt: 'Help me find realistic study time in my current calendar view.',
    },
    {
      label: 'Fix conflicts',
      prompt:
        'Look at my current calendar context and help me reason through any scheduling conflicts or overloaded days.',
    },
    {
      label: 'Plan around work',
      prompt:
        'Help me plan my schoolwork around my fixed events and work schedule.',
    },
  ],
};

const FALLBACK_ACTIONS: SuggestedAction[] = [
  {
    label: 'Help me plan',
    prompt: 'Help me make a realistic plan based on where I am in Planevo.',
  },
  {
    label: 'What matters most?',
    prompt: 'Help me figure out what matters most right now.',
  },
  {
    label: 'Recover my schedule',
    prompt: 'Help me recover my schedule without shame or overplanning.',
  },
];

export function BrunoSuggestedActions({
  onSelectAction,
}: {
  onSelectAction: (prompt: string) => void;
}) {
  const { currentContext } = useBruno();
  const source = currentContext?.source ?? 'fallback';
  const actions = ACTIONS[source] ?? FALLBACK_ACTIONS;

  return (
    <div
      aria-label="Suggested Bruno actions"
      className="flex flex-nowrap overflow-x-auto md:flex-wrap gap-2 pb-3 px-0 scrollbar-hide"
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => onSelectAction(action.prompt)}
          className="rounded-full border border-[var(--color-settings-border)] bg-[var(--color-settings-bg)] px-3 py-2 text-xs text-[var(--color-settings-text-muted)] transition-colors hover:bg-[var(--color-settings-card-hover)] hover:text-[var(--color-settings-text)]"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
