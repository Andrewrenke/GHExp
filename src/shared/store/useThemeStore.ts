import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {asyncStorage} from './persist';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

// Small, single-responsibility slice — consumers select `s => s.mode`
// so a call to setMode() doesn't re-render subscribers that only read
// the mode via a stable selector.
export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      mode: 'system',
      setMode: mode => set({mode}),
    }),
    {name: 'theme', storage: asyncStorage<ThemeState>()},
  ),
);
