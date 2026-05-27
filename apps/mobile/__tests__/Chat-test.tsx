import React from 'react';
import { render } from '@testing-library/react-native';
import BrunoChatScreen from '../app/(tabs)/chat';

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

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb) => cb({ data: [] })),
  }
}));

describe('BrunoChatScreen Smoke Test', () => {
  it('renders chat input correctly', () => {
    const { getByTestId, getByText } = render(<BrunoChatScreen />);
    expect(getByTestId('chat-input')).toBeTruthy();
    expect(getByText('Bruno')).toBeTruthy();
  });
});
