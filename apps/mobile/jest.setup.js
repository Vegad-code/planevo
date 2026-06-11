import { jest } from '@jest/globals';
import React from 'react';

// Suppress act warnings if any
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && /Warning.*not wrapped in act/.test(args[0])) {
    return;
  }
  originalError.call(console, ...args);
};

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Text = (props) => <RN.View {...props} />;
  RN.ActivityIndicator = (props) => <RN.View {...props} />;
  return RN;
});
