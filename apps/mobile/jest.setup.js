import { jest } from '@jest/globals';

// Suppress act warnings if any
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && /Warning.*not wrapped in act/.test(args[0])) {
    return;
  }
  originalError.call(console, ...args);
};

jest.mock('react-native', () => {
  const React = require('react');
  const RN = jest.requireActual('react-native');
  const host = (name) => {
    const Component = ({ children, ...props }) =>
      React.createElement(name, props, children);
    Component.displayName = name;
    return Component;
  };
  Object.defineProperty(RN, 'View', {
    configurable: true,
    value: host('View'),
  });
  Object.defineProperty(RN, 'Text', {
    configurable: true,
    value: host('Text'),
  });
  Object.defineProperty(RN, 'Pressable', {
    configurable: true,
    value: host('Pressable'),
  });
  Object.defineProperty(RN, 'TouchableOpacity', {
    configurable: true,
    value: host('TouchableOpacity'),
  });
  Object.defineProperty(RN, 'TextInput', {
    configurable: true,
    value: host('TextInput'),
  });
  Object.defineProperty(RN, 'ActivityIndicator', {
    configurable: true,
    value: host('ActivityIndicator'),
  });
  Object.defineProperty(RN, 'StyleSheet', {
    configurable: true,
    value: {
      create: (styles) => styles,
      flatten: (style) => style,
    },
  });
  return RN;
});
