// Async storage's native module isn't available in the Jest env;
// use the official in-memory mock so store persistence code paths
// don't crash unit tests.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// NetInfo has native pieces too; a no-op mock is enough for stores
// that don't assert on subscription behaviour.
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn().mockResolvedValue({isConnected: true}),
}));
