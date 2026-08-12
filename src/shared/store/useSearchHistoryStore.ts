import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {asyncStorage} from './persist';

const MAX_HISTORY = 10;

type SearchHistoryState = {
  history: readonly string[];
  push: (query: string) => void;
  clear: () => void;
};

// Kept as client state (not in TanStack Query) because the list of
// past queries is not a server resource — it's a UI convenience.
// Duplicating it into the cache would blur the state-separation rule.
export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    set => ({
      history: [],
      push: query =>
        set(state => {
          const trimmed = query.trim();
          if (!trimmed) return state;
          // Dedupe by moving an existing entry to the front — matches
          // how iOS Spotlight / Chrome address bar behave.
          const next = [trimmed, ...state.history.filter(q => q !== trimmed)];
          return {history: next.slice(0, MAX_HISTORY)};
        }),
      clear: () => set({history: []}),
    }),
    {name: 'search-history', storage: asyncStorage<SearchHistoryState>()},
  ),
);
