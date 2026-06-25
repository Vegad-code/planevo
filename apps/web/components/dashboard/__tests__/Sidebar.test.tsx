import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import {
  BrunoProvider,
  useBruno,
} from '@/components/bruno/BrunoProvider';
import Sidebar from '@/components/dashboard/Sidebar';

const { setMobileMenuOpen, supabase, mockSidebarStyle } = vi.hoisted(() => ({
  setMobileMenuOpen: vi.fn(),
  mockSidebarStyle: { current: 'classic' as 'classic' | 'floating' },
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
      }),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    })),
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

vi.mock('@/components/providers/AppearanceProvider', () => ({
  useAppearance: () => ({
    sidebarStyle: mockSidebarStyle.current,
    reduceMotion: false,
  }),
}));

function BrunoStateProbe() {
  const { isOpen } = useBruno();

  return <div data-testid="bruno-open-state">{isOpen ? 'open' : 'closed'}</div>;
}

describe('Sidebar Bruno entry point', () => {
  beforeEach(() => {
    mockSidebarStyle.current = 'classic';
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

  it('renders the classic rectangular sidebar by default', async () => {
    const { container } = render(
      <BrunoProvider>
        <Sidebar />
      </BrunoProvider>
    );

    await screen.findByRole('button', { name: /Ask Bruno/i });

    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('top-0');
    expect(aside?.className).toContain('h-full');
    expect(aside?.className).not.toContain('shadow-2xl');
  });

  it('renders the floating pill sidebar when selected', async () => {
    mockSidebarStyle.current = 'floating';

    const { container } = render(
      <BrunoProvider>
        <Sidebar />
      </BrunoProvider>
    );

    await screen.findByRole('button', { name: /Ask Bruno/i });

    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('shadow-2xl');
    expect(aside?.className).toContain('top-4');
  });
});
