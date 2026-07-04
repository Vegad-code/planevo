import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BrunoProvider } from '@/components/bruno/BrunoProvider';
import { BrunoDock } from '@/components/bruno/BrunoDock';

const chatSidebarMountCount = { current: 0 };

vi.mock('@/components/dashboard/BrunoChatSidebar', () => ({
  default: function MockBrunoChatSidebar({
    isFullScreen,
    onMinimize,
    onToggleFullScreen,
  }: {
    isFullScreen?: boolean;
    onMinimize?: () => void;
    onToggleFullScreen?: () => void;
  }) {
    useEffect(() => {
      chatSidebarMountCount.current += 1;
    }, []);

    return (
      <div
        data-testid="bruno-chat-sidebar"
        data-full-screen={isFullScreen ? 'true' : 'false'}
      >
        <button type="button" onClick={onToggleFullScreen}>
          Toggle full screen
        </button>
        <button type="button" onClick={onMinimize}>
          Minimize
        </button>
      </div>
    );
  },
}));

describe('BrunoDock', () => {
  it('opens Bruno as a modal without the bear launcher mark', () => {
    render(
      <BrunoProvider>
        <BrunoDock />
      </BrunoProvider>
    );

    expect(screen.getByText('Ask Bruno anything…')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Bruno the Bear/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Bruno chat' }));

    expect(screen.getByTestId('bruno-chat-sidebar')).toHaveAttribute(
      'data-full-screen',
      'false'
    );
  });

  it('toggles full-screen mode without remounting the chat and closes from the chat body', async () => {
    chatSidebarMountCount.current = 0;

    render(
      <BrunoProvider>
        <BrunoDock />
      </BrunoProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Bruno chat' }));

    await waitFor(() => {
      expect(chatSidebarMountCount.current).toBe(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Toggle full screen' }));

    expect(screen.getByTestId('bruno-chat-sidebar')).toHaveAttribute(
      'data-full-screen',
      'true'
    );
    expect(chatSidebarMountCount.current).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle full screen' }));

    expect(screen.getByTestId('bruno-chat-sidebar')).toHaveAttribute(
      'data-full-screen',
      'false'
    );
    expect(chatSidebarMountCount.current).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));

    await waitFor(() => {
      expect(screen.queryByTestId('bruno-chat-sidebar')).not.toBeInTheDocument();
    });
  });
});
