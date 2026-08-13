// MMKV is a Nitro module: importing it evaluates native bindings via
// TurboModuleRegistry.getEnforcing, which throws in the Jest environment before
// the library's own test-mode detection ever runs. An in-memory implementation
// keeps the real JSON/serialisation logic in persist.ts under test — only the
// native key-value engine is replaced.
jest.mock('react-native-mmkv', () => {
  const stores = new Map();

  const createMMKV = (config = {}) => {
    const id = config.id ?? 'default';
    if (!stores.has(id)) stores.set(id, new Map());
    const store = stores.get(id);
    return {
      getString: key => (store.has(key) ? store.get(key) : undefined),
      set: (key, value) => store.set(key, value),
      remove: key => store.delete(key),
      clearAll: () => store.clear(),
      getAllKeys: () => Array.from(store.keys()),
      contains: key => store.has(key),
    };
  };

  return {
    createMMKV,
    // Test helper: reset every instance between tests.
    __resetAllStores: () => stores.forEach(store => store.clear()),
  };
});

// FlashList measures layout asynchronously and commits state after the render
// pass, which surfaces in tests as "An update to ForwardRef(FlashList) inside a
// test was not wrapped in act(...)" — noise that no amount of awaiting in the
// test can remove, because it happens outside React's test scheduler.
// FlatList accepts the same props the app passes (data, renderItem,
// keyExtractor, onEndReached, ListFooterComponent) and renders synchronously,
// so screen tests still assert against real card output.
// Trade-off: FlashList's own recycling behaviour is not under test here — that
// belongs in an E2E run on a real device, not in jsdom.
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const {FlatList} = require('react-native');
  const MockFlashList = React.forwardRef((props, ref) =>
    React.createElement(FlatList, {...props, ref}),
  );
  MockFlashList.displayName = 'FlashList';
  return {FlashList: MockFlashList};
});

// NetInfo has native pieces too; a no-op mock is enough for stores
// that don't assert on subscription behaviour.
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn().mockResolvedValue({isConnected: true}),
}));
