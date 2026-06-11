import * as React from 'react';
import { render } from '@testing-library/react-native';

import { MonoText } from '../StyledText';

jest.mock('../useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

// TODO: Fix React 19 jest-expo constructor bug
it.skip(`renders correctly`, () => {
  const { getByText } = render(<MonoText>Text test!</MonoText>);

  expect(getByText('Text test!')).toBeTruthy();
});
