import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import {
  BrunoProvider,
  useBruno,
} from '@/components/bruno/BrunoProvider';
import Sidebar from '@/components/dashboard/Sidebar';

const { setMobileMenuOpen, supabase } = vi.hoisted(() => ({
  setMobileMenuOpen: vi.fn(),
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
      }),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/tasks',
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => supabase,
}));

vi.mock('@/lib/store/ui-store', () => ({
  useUIStore: () => ({
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
    mobileMenuOpen: false,
    setMobileMenuOpen,
  }),
}));

function BrunoStateProbe() {
  const { isOpen } = useBruno();

  return <div data-testid="bruno-open-state">{isOpen ? 'open' : 'closed'}</div>;
}

describe('Sidebar Bruno entry point', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      }
    );
  });

  it('opens the global Bruno shell instead of linking to the chat route', async () => {
    render(
      <BrunoProvider>
        <Sidebar />
        <BrunoStateProbe />
      </BrunoProvider>
    );

    expect(
      (await screen.findByTestId('bruno-open-state')).textContent
    ).toBe('closed');
    expect(screen.queryByRole('link', { name: /Ask Bruno/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Ask Bruno/i }));

    expect(screen.getByTestId('bruno-open-state').textContent).toBe('open');
    expect(setMobileMenuOpen).toHaveBeenCalledWith(false);
  });
});
