const mockUsersQuery: any = {};
mockUsersQuery.select = jest.fn(() => mockUsersQuery);
mockUsersQuery.eq = jest.fn(() => mockUsersQuery);
mockUsersQuery.single = jest.fn();

const mockIntegrationsQuery: any = {};
mockIntegrationsQuery.select = jest.fn(() => mockIntegrationsQuery);
mockIntegrationsQuery.eq = jest.fn(() => mockIntegrationsQuery);
mockIntegrationsQuery.then = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'integration_accounts_public') return mockIntegrationsQuery;
      return mockUsersQuery;
    }),
  },
}));

describe('globalStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersQuery.single.mockResolvedValue({
      data: {
        id: 'user-1',
        name: 'Pilot',
        email: 'pilot@example.com',
        plan_type: 'free',
        energy_preference: 'medium',
        push_notifications_enabled: true,
        notification_preferences: [{
          master_toggle: true,
          channels: { push: true, email: true },
        }],
      },
      error: null,
    });
    mockIntegrationsQuery.then.mockImplementation((resolve: (value: unknown) => unknown) => Promise.resolve(resolve({
      data: [
        { provider: 'canvas', status: 'connected' },
        { provider: 'google_calendar', status: 'disconnected' },
      ],
      error: null,
    })));
  });

  it('derives integration connection status from public integration rows', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useGlobalStore } = require('../globalStore');

    useGlobalStore.setState({
      profile: null,
      notificationPrefs: null,
      loading: false,
      error: null,
    });

    await useGlobalStore.getState().fetchProfile('user-1');

    expect(useGlobalStore.getState().profile).toMatchObject({
      id: 'user-1',
      name: 'Pilot',
      canvasConnected: true,
      googleConnected: false,
    });
  });
});
