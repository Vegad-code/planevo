import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  BrunoProvider,
  useRegisterBrunoContext,
} from '@/components/bruno/BrunoProvider';
import { BrunoSuggestedActions } from '@/components/bruno/BrunoSuggestedActions';

function TasksActions({
  onSelectAction,
}: {
  onSelectAction: (prompt: string) => void;
}) {
  useRegisterBrunoContext({
    source: 'tasks',
    page: '/dashboard/tasks',
    label: 'Tasks',
  });

  return <BrunoSuggestedActions onSelectAction={onSelectAction} />;
}

describe('BrunoSuggestedActions', () => {
  it('shows actions for the active source and returns the selected prompt', () => {
    const onSelectAction = vi.fn();

    render(
      <BrunoProvider>
        <TasksActions onSelectAction={onSelectAction} />
      </BrunoProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Prioritize tasks' }));

    expect(onSelectAction).toHaveBeenCalledWith(
      'Help me prioritize my tasks by urgency, importance, and effort.'
    );
    expect(
      screen.queryByRole('button', { name: 'Review my week' })
    ).not.toBeInTheDocument();
  });

  it('shows fallback actions without a registered source', () => {
    render(
      <BrunoProvider>
        <BrunoSuggestedActions onSelectAction={() => undefined} />
      </BrunoProvider>
    );

    expect(
      screen.getByRole('button', { name: 'Help me plan' })
    ).toBeInTheDocument();
  });
});
