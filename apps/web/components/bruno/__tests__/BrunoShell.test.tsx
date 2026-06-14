import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
  BrunoProvider,
  useBruno,
} from '@/components/bruno/BrunoProvider';
import { BrunoShell } from '@/components/bruno/BrunoShell';

vi.mock('@/components/dashboard/BrunoChatSidebar', () => ({
  default: () => <div data-testid="bruno-chat-sidebar">Bruno chat</div>,
}));

function OpenButton() {
  const { openBruno } = useBruno();

  return (
    <button type="button" onClick={() => openBruno()}>
      Open Bruno
    </button>
  );
}

describe('BrunoShell', () => {
  it('does not render the chat while closed', () => {
    render(
      <BrunoProvider>
        <BrunoShell />
      </BrunoProvider>
    );

    expect(screen.queryByTestId('bruno-chat-sidebar')).toBeNull();
  });

  it('renders globally and closes from the overlay', async () => {
    render(
      <BrunoProvider>
        <OpenButton />
        <BrunoShell />
      </BrunoProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Bruno' }));

    expect(screen.getByTestId('bruno-chat-sidebar')).not.toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Close Bruno overlay' })
    );

    await waitFor(() => {
      expect(screen.queryByTestId('bruno-chat-sidebar')).toBeNull();
    });
  });

  it('closes from a control inside the panel', async () => {
    render(
      <BrunoProvider>
        <OpenButton />
        <BrunoShell />
      </BrunoProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Bruno' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Bruno panel' })
    );

    await waitFor(() => {
      expect(screen.queryByTestId('bruno-chat-sidebar')).toBeNull();
    });
  });
});
