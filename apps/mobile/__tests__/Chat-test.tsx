import { render, waitFor } from '@testing-library/react-native';

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
    user: { id: 'test-user' },
    session: null,
  })
}));

jest.mock('@/lib/supabase', () => {
  const query: Record<string, jest.Mock> = {};
  ['from', 'select', 'delete', 'eq', 'neq', 'is', 'ilike', 'gte', 'lt', 'order', 'limit'].forEach(
    (method) => {
      query[method] = jest.fn(() => query);
    }
  );
  query.then = jest.fn((resolve) => Promise.resolve(resolve({ data: null })));

  return { supabase: query };
});

describe('BrunoChatScreen Smoke Test', () => {
  // TODO: Fix Invalid hook call caused by React 19 and jest-expo incompatibility
  it.skip('renders chat input correctly', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BrunoChatScreen = require('../app/(tabs)/chat').default;
    const utils = render(<BrunoChatScreen />);

    await waitFor(() => {
      expect(utils.getByTestId('chat-input')).toBeTruthy();
      expect(utils.getByText('Bruno')).toBeTruthy();
    });
  });
});
