import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {asyncStorage} from './persist';

// Favorites are stored by full_name (owner/repo). We deliberately
// don't cache the full Repository object here — those live in the
// query cache. If a favorited repo is missing from cache, the detail
// screen fetches it fresh. Storing just the ID keeps this store tiny
// and immune to schema drift over time.

type FavoritesState = {
  favorites: readonly string[];
  isFavorite: (fullName: string) => boolean;
  toggle: (fullName: string) => void;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isFavorite: fullName => get().favorites.includes(fullName),
      toggle: fullName =>
        set(state => {
          const has = state.favorites.includes(fullName);
          return {
            favorites: has
              ? state.favorites.filter(f => f !== fullName)
              : [fullName, ...state.favorites],
          };
        }),
    }),
    {
      name: 'favorites',
      storage: asyncStorage<FavoritesState>(),
      // Methods don't need to be persisted — only the array does.
      // (zustand persists everything by default; a partialize is
      // cheap protection against future schema drift.)
      partialize: state => ({favorites: state.favorites}) as FavoritesState,
    },
  ),
);
