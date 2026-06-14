import { fireEvent, render, screen } from '@testing-library/react';
import {
  BrunoProvider,
  useBruno,
  useRegisterBrunoContext,
} from '@/components/bruno/BrunoProvider';

function ProviderHarness() {
  const { closeBruno, currentContext, isOpen, openBruno } = useBruno();

  return (
    <div>
      <div data-testid="open-state">{isOpen ? 'open' : 'closed'}</div>
      <div data-testid="context-label">{currentContext?.label ?? 'none'}</div>
      <button
        type="button"
        onClick={() =>
          openBruno({
            source: 'tasks',
            page: '/dashboard/tasks',
            label: 'Tasks',
          })
        }
      >
        Open tasks
      </button>
      <button type="button" onClick={closeBruno}>
        Close
      </button>
    </div>
  );
}

function RegisteredContext() {
  useRegisterBrunoContext({
    source: 'dashboard',
    page: '/dashboard',
    label: 'Dashboard',
  });

  return null;
}

function RegisteredContextHarness() {
  const { currentContext, isOpen } = useBruno();

  return (
    <>
      <RegisteredContext />
      <div data-testid="open-state">{isOpen ? 'open' : 'closed'}</div>
      <div data-testid="context-label">{currentContext?.label ?? 'none'}</div>
    </>
  );
}

describe('BrunoProvider', () => {
  it('opens Bruno with page context and closes it', () => {
    render(
      <BrunoProvider>
        <ProviderHarness />
      </BrunoProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open tasks' }));

    expect(screen.getByTestId('open-state').textContent).toBe('open');
    expect(screen.getByTestId('context-label').textContent).toBe('Tasks');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByTestId('open-state').textContent).toBe('closed');
  });

  it('registers page context without opening Bruno', () => {
    render(
      <BrunoProvider>
        <RegisteredContextHarness />
      </BrunoProvider>
    );

    expect(screen.getByTestId('open-state').textContent).toBe('closed');
    expect(screen.getByTestId('context-label').textContent).toBe('Dashboard');
  });
});
