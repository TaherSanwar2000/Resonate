module.exports = {
  preset: '@react-native/jest-preset',
  resolver: 'react-native-worklets/jest/resolver.js',
  moduleNameMapper: {
    '\\.wav$': '<rootDir>/__mocks__/audioAssetMock.js',
  },
  setupFiles: [
    '@shopify/react-native-skia/jestSetup.js',
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-gesture-handler|react-native-reanimated|react-native-worklets|react-native-safe-area-context|react-native-audio-api|@shopify/react-native-skia)/)',
  ],
};
