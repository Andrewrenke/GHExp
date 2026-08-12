import React, {useEffect} from 'react';
import {QueryClient, focusManager, onlineManager} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {AppState, type AppStateStatus, Platform} from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 24h GC keeps rehydrated queries alive long enough to be
      // useful offline; the persister still enforces its own maxAge
      // so truly stale caches get dropped.
      gcTime: 24 * 60 * 60 * 1000,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // Serve cache first when offline; don't spam retries for a
      // query that has no cache yet.
      networkMode: 'offlineFirst',
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'react-query-cache',
  throttleTime: 1_000,
});

// react-query's default onlineManager listens for the browser
// 'online' event, which never fires on native. Wiring it to NetInfo
// makes refetch-on-reconnect actually work.
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => {
    setOnline(!!state.isConnected);
  }),
);

// Same story for focus — no window focus event on native.
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

export function QueryProvider({children}: {children: React.ReactNode}) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        // A week is plenty for a search app — beyond that GitHub
        // data is stale enough that a fresh fetch beats old cache.
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}
