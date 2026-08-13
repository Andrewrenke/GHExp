import {createMMKV} from 'react-native-mmkv';

// One MMKV instance for the whole app. MMKV is memory-mapped and synchronous:
// reads don't cross the bridge and don't return promises, which is why the
// zustand adapter below can rehydrate without a frame of "no persisted state
// yet" — the flash of default theme / empty favorites that AsyncStorage caused
// on every cold start.
//
// The README previously justified AsyncStorage on the grounds that MMKV needs a
// custom dev client and therefore couldn't run in Expo Go. That constraint is
// gone now that ios/ and android/ are prebuilt.
export const storage = createMMKV({id: 'github-explorer'});

// Minimal surface the persisters need, so nothing outside this file has to know
// which storage engine is underneath.
export const syncStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => {
    storage.remove(key);
  },
};
