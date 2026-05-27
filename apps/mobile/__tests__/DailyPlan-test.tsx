import React from 'react';
import { render } from '@testing-library/react-native';
import DailyPlanScreen from '../app/(tabs)/index';

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

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation((cb) => cb({ data: [] })),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } })
    }
  }
}));

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

describe('DailyPlanScreen Smoke Test', () => {
  it('renders correctly', () => {
    const { getByTestId, getByText } = render(<DailyPlanScreen />);
    expect(getByTestId('daily-plan-header')).toBeTruthy();
    expect(getByText(/YOUR DAY/i)).toBeTruthy();
  });
});
