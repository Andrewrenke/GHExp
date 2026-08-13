import React, {useEffect, useMemo} from 'react';
import {QueryClient, focusManager, onlineManager} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createSyncStoragePersister} from '@tanstack/query-sync-storage-persister';
import NetInfo from '@react-native-community/netinfo';
import {AppState, type AppStateStatus} from 'react-native';
import {syncStorage} from '@/shared/store/storage';

// A factory rather than a module-scope singleton. A single shared client meant
// every test file (and every render in a test file) accumulated into the same
// cache, so tests could pass or fail depending on what ran before them.
// Production gets exactly one instance, created once in the provider below;
// tests inject a disposable one through the `client` prop.
function createQueryClient(): QueryClient {
  return new QueryClient({
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
}

// MMKV is synchronous, so the cache is restored in one pass at startup instead
// of an async round-trip that lets an empty list paint first.
const persister = createSyncStoragePersister({
  storage: syncStorage,
  key: 'react-query-cache',
  throttleTime: 1_000,
});

// react-query's default onlineManager listens for the browser
// 'online' event, which never fires on native. Wiring it to NetInfo
// makes refetch-on-reconnect actually work. This is also the app's single
// NetInfo subscription — `useOnlineStatus` reads back out of onlineManager
// rather than opening a second one.
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => {
    setOnline(!!state.isConnected);
  }),
);

// Same story for focus — no window focus event on native. This used to be
// wrapped in a `Platform.OS !== 'web'` guard; the web target has since been
// dropped (see CLAUDE.md), so the guard was dead by construction.
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

type Props = {
  children: React.ReactNode;
  /** Test seam: pass a throwaway client to isolate a test's cache. */
  client?: QueryClient;
};

export function QueryProvider({children, client}: Props) {
  const queryClient = useMemo(() => client ?? createQueryClient(), [client]);

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
