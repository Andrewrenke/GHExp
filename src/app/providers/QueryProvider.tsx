import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

// One client per app lifetime; kept module-scoped so navigation-driven
// remounts of the provider (if they ever happen) don't wipe the cache.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // GitHub's unauthenticated Search limit is tight (~10/min) — being
      // slightly generous with cache time avoids re-fetching the same
      // query on quick back-nav.
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

type Props = {children: React.ReactNode};

export function QueryProvider({children}: Props) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
