import AsyncStorage from '@react-native-async-storage/async-storage';
import type {PersistStorage, StorageValue} from 'zustand/middleware';

// Zustand's `createJSONStorage` works with AsyncStorage out of the box,
// but this typed adapter keeps error handling in one place and lets
// tests substitute a mock without touching every store.
export function asyncStorage<T>(): PersistStorage<T> {
  return {
    getItem: async name => {
      const raw = await AsyncStorage.getItem(name);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as StorageValue<T>;
      } catch {
        // A corrupt entry (partial write, schema drift) shouldn't
        // brick the app on next launch — treat as "no stored value".
        return null;
      }
    },
    setItem: (name, value) => AsyncStorage.setItem(name, JSON.stringify(value)),
    removeItem: name => AsyncStorage.removeItem(name),
  };
}
