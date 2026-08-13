import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {SearchScreen} from './SearchScreen';
import {ThemeProvider} from '@/shared/theme/ThemeProvider';
import {useSearchHistoryStore} from '@/shared/store/useSearchHistoryStore';
import fixture from '@/entities/repository/model/__fixtures__/searchResponse.json';

// The first screen-level test. It goes through the real query hook, the real
// Zod parse and the real card rendering — only `fetch` and navigation are
// stubbed — so it covers the integration seams that the pure-function tests
// structurally cannot.

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate}),
}));

function renderScreen() {
  // A disposable client per test: no cache bleeds between cases, and retries
  // are off so an error case resolves immediately instead of backing off.
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false, gcTime: 0}},
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SearchScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

// See client.test.ts — `global` is a Node type this project doesn't pull in,
// and the stubs aren't real `Response` objects.
function stubFetch(response: unknown) {
  return jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(response as Awaited<ReturnType<typeof fetch>>);
}

beforeEach(() => {
  mockNavigate.mockClear();
  useSearchHistoryStore.setState({history: []});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('SearchScreen', () => {
  it('shows the first-run empty state before anything is typed', () => {
    renderScreen();

    expect(screen.getByText('Search GitHub')).toBeTruthy();
  });

  // Recent searches replace the static hint once history exists — the consumer
  // that makes the previously write-only history store worth persisting.
  it('shows recent searches instead of the hint when history exists', () => {
    useSearchHistoryStore.setState({history: ['react-native']});

    renderScreen();

    expect(screen.getByText('Recent searches')).toBeTruthy();
    expect(screen.getByText('react-native')).toBeTruthy();
    expect(screen.queryByText('Search GitHub')).toBeNull();
  });

  it('renders results returned by the API', async () => {
    stubFetch({
      ok: true,
      status: 200,
      headers: {get: () => null},
      json: async () => fixture,
    });

    renderScreen();
    // Typing is debounced by 350ms, so drive the query directly through the
    // input rather than waiting on a timer here.
    const input = screen.getByLabelText('Search GitHub repositories');
    fireEvent.changeText(input, 'react-native');

    await waitFor(
      () => {
        expect(screen.getByText('facebook/react-native')).toBeTruthy();
      },
      {timeout: 3000},
    );
  });

  it('surfaces a rate limit with its own copy rather than a generic error', async () => {
    stubFetch({
      ok: false,
      status: 403,
      headers: {
        get: (key: string) => (key.toLowerCase() === 'x-ratelimit-remaining' ? '0' : null),
      },
      json: async () => ({message: 'rate limited'}),
    });

    renderScreen();
    const input = screen.getByLabelText('Search GitHub repositories');
    fireEvent.changeText(input, 'react-native');

    await waitFor(
      () => {
        expect(screen.getByText('Rate limit reached')).toBeTruthy();
      },
      {timeout: 3000},
    );
  });
});
