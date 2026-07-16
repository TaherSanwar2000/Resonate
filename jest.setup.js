/* eslint-env jest */
require('react-native-gesture-handler/jestSetup');

require('react-native-reanimated').setUpTests();

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-audio-api', () => ({
  ...require('react-native-audio-api/mock'),
  AudioManager: {
    setAudioSessionOptions: jest.fn(),
    setAudioSessionActivity: jest.fn(),
  },
}));
