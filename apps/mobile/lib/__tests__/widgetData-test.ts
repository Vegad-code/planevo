jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'expo' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('react-native-shared-group-preferences', () => {
  throw new Error('Native module is unavailable in Expo Go');
});

describe('writeWidgetData in Expo Go', () => {
  it('does not load the custom native widget module', async () => {
    const { writeWidgetData } = require('../widgetData');

    await expect(writeWidgetData(null)).resolves.toBeUndefined();
  });
});
