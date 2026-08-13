const {jestModuleNameMapper} = require('./aliases');

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Derived from tsconfig.json — see aliases.js.
  moduleNameMapper: jestModuleNameMapper,
  // jest-expo whitelists most Expo/RN packages for transform;
  // this extends it for the extra native modules we added.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/flash-list|@tanstack/.*|zustand|react-native-mmkv|react-native-nitro-modules))',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/**/__fixtures__/**'],
  // A floor, not a target. Set just under current numbers so an accidental
  // deletion of tests fails CI, without pretending the app is fully covered.
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 45,
      functions: 45,
      lines: 55,
    },
  },
};
