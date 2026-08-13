import type {PersistStorage, StorageValue} from 'zustand/middleware';
import {syncStorage} from './storage';

// Zustand's `createJSONStorage` works with MMKV out of the box, but this typed
// adapter keeps error handling in one place and lets tests substitute a mock
// without touching every store.
//
// Now backed by MMKV rather than AsyncStorage: the reads are synchronous, so
// stores rehydrate before first paint instead of one tick after it.
export function asyncStorage<T>(): PersistStorage<T> {
  return {
    getItem: name => {
      const raw = syncStorage.getItem(name);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as StorageValue<T>;
      } catch {
        // A corrupt entry (partial write, schema drift) shouldn't
        // brick the app on next launch — treat as "no stored value".
        return null;
      }
    },
    setItem: (name, value) => syncStorage.setItem(name, JSON.stringify(value)),
    removeItem: name => syncStorage.removeItem(name),
  };
}
