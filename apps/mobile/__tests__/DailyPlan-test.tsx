import { render, waitFor } from '@testing-library/react-native';

// Mock dependencies
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    colors: { background: '#fff', text: '#000', card: '#fff' },
    isDark: false,
  })
}));

jest.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => ({
    isOffline: false,
  })
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    session: { access_token: 'test-token' },
  })
}));

jest.mock('@/lib/supabase', () => {
  const query: Record<string, jest.Mock> = {};
  ['from', 'select', 'eq', 'neq', 'is', 'gte', 'lte', 'order'].forEach((method) => {
    query[method] = jest.fn(() => query);
  });
  query.single = jest.fn().mockResolvedValue({ data: null });
  query.then = jest.fn((resolve) => Promise.resolve(resolve({ data: [] })));

  const channel = {
    on: jest.fn(),
    subscribe: jest.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);

  return {
    supabase: {
      ...query,
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
    },
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  })
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light' }
}));

jest.mock('@/lib/widgetData', () => ({
  writeWidgetData: jest.fn().mockResolvedValue(undefined),
}));

describe('DailyPlanScreen Smoke Test', () => {
  // TODO: Fix Invalid hook call caused by React 19 and jest-expo incompatibility
  it.skip('renders correctly', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DailyPlanScreen = require('../app/(tabs)/index').default;
    const utils = render(<DailyPlanScreen />);

    await waitFor(() => {
      expect(utils.getByTestId('daily-plan-header')).toBeTruthy();
      expect(utils.getByText(/NO PLAN YET FOR TODAY/i)).toBeTruthy();
    });
  });
});
