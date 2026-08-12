# GitHubExplorer (Expo)

A small cross-platform GitHub search app. Built as a take-home to demonstrate
engineering decisions — the point isn't the feature list, it's *why* each
choice was made and what was traded away.

> _Screenshots go here once the app is running on a device — see
> "Verification status" below._

---

## Setup

Requires Node ≥ 20 (the RN 0.86 codegen used by Expo SDK 57 asks for
20.19+ / 22.13+ / 24.3+ — Node 22.9 works with warnings). Yarn or npm are
both fine; this project ships a `package-lock.json`.

```bash
npm install --legacy-peer-deps
npm start             # Expo dev server
npm run android       # opens in Android emulator / Expo Go
npm run ios           # opens in iOS Simulator / Expo Go
```

Optional: set `GITHUB_TOKEN` in the environment before starting Metro to raise
the unauthenticated Search API limit from ~10 req/min to 30 req/min:

```bash
GITHUB_TOKEN=ghp_... npm start
```

Never commit a real token — this variable is read via `process.env` and
inlined by Metro; production builds ship without it.

---

## Verification status

This variant was built without a working Android SDK on the author's machine.
Consequently:

- ✅ `npx tsc --noEmit` — clean, strict mode + `noUncheckedIndexedAccess`.
- ✅ `npx jest` — 15/15 passing (schemas, hooks, pagination boundary, favorites store).
- ⚠️ Runtime UI has not been visually verified. `npm run android` / `npm run ios`
  should launch, but no cold-start / FPS / render screenshots are attached yet.

The reference variant in this same take-home (`../GitHubExplorer`) was built
first against the bare React Native CLI; this Expo variant is a code-for-code
port of that project with the following deliberate platform swaps.

---

## Key decisions

For each decision below: **what → why → alternative → trade-off.**

### Bootstrap: `create-expo-app` (SDK 57) instead of RN CLI
- **Why:** Expo removes the Android SDK / CocoaPods setup burden and ships
  a working dev-client story out of the box. The assignment allows any stack;
  Expo is the shortest path to a runnable app on a physical device via Expo Go.
- **Alternative:** `@react-native-community/cli init` (also implemented — see
  the sibling `GitHubExplorer/` directory).
- **Trade-off:** Some libraries (notably `react-native-mmkv`) don't run in
  Expo Go and require a custom dev-client build. Documented per-swap below.

### Server state vs client state (the core thesis)
- Server state (repos, details) lives in **TanStack Query**.
- Client state (theme, favorites, search history) lives in **Zustand**.
- API results are **never** duplicated into Zustand — favorites persist only
  the `owner/repo` full-name; the full `Repository` object stays in the query
  cache. When you navigate to detail via a favorite, `useRepositoryDetail`
  hydrates from the cache if the object is there, otherwise refetches.
- **Alternative:** Redux Toolkit + RTK Query. Rejected because it's a heavier
  runtime and produces the same feature at a higher cognitive cost — this app
  has no cross-slice orchestration to justify a single global store.

### TanStack `useInfiniteQuery` for pagination
- **Why:** The Search API is exactly the shape it was built for — cursorless
  pagination via `page=N`, per-query cache, request deduplication, cancellation
  on unmount, retry with backoff.
- Retry policy explicitly skips `RateLimitError` and `SchemaError` (both
  terminal — retrying a 403 just wastes your remaining quota).
- **Pagination boundary:** the Search API caps results at 1000. `getNextSearchPage`
  is exported and unit-tested for the "page 10 has no next page" case; hitting
  page 11 would return HTTP 422 instead.

### FlashList v2 over FlatList
- **Why:** cell recycling → measurably lower memory and smoother scroll
  on large lists (Shopify's own benchmarks show ~5× less memory pressure
  vs FlatList in worst-case scenarios).
- `keyExtractor` and `renderItem` are hoisted out of the parent render;
  `RepositoryCard` is `React.memo`'d with a stable `onPress` reference —
  otherwise the recycling gains would be undone by fresh function refs on
  every keystroke in the search box.
- FlashList v2 under New Architecture doesn't need `estimatedItemSize` any
  more — omitted intentionally.

### Zod at the API boundary
- **Why:** the GitHub response is real-world JSON — `description` and
  `language` are frequently `null`, and fields we don't model shouldn't be
  hand-written into an interface only to drift. Zod parses at the network
  edge and derives the TS types via `z.infer`, so a shape drift shows up as
  a **`SchemaError` at the boundary**, not as `Cannot read undefined` in a
  component.
- Only the fields the UI actually renders are parsed — smaller memory
  footprint across a 100-item page, and the fixture-based schema test
  documents exactly what those fields are.

### `per_page=100`
- **Why:** matches the assignment's spec.
- **Trade-off:** more memory per page, fewer round-trips under a tight rate
  limit — the right call for the unauthenticated Search API (~10 req/min).

### Typed error hierarchy
- `NetworkError | TimeoutError | RateLimitError | ApiError | SchemaError`
  — the UI branches on the failure mode. `RateLimitError` gets its own
  banner ("try again shortly or set `GITHUB_TOKEN`") instead of the
  generic "something went wrong" that reviewers correctly dislike.

### Test-first, only where it pays off (see PLAN §0.2)
- **Test-first:** Zod schemas, `useDebouncedValue`, `getNextSearchPage`
  pagination boundary, `useFavoritesStore` transitions.
- **Skipped:** UI components, screens, FlashList rendering — those stabilize
  through iteration, and testing them before the UI exists produces brittle,
  throwaway tests. `react-devtools` Profiler + the built-in Perf Monitor are
  the right tools there.

### Persistence
- **Chosen:** `@react-native-async-storage/async-storage` with TanStack's
  `PersistQueryClientProvider` + `createAsyncStoragePersister`. Zustand
  stores use a small typed AsyncStorage adapter with defensive JSON parse
  (a corrupt entry returns `null` instead of throwing on next launch).
- **PLAN.md called for `react-native-mmkv`** (synchronous, faster). MMKV
  requires a custom dev-client build under Expo — it doesn't work in Expo
  Go. Trade-off accepted: async is fine at this scale, and Expo Go
  compatibility is worth more than the microsecond difference on a
  read/write path that fires on user actions.

### Offline
- `PersistQueryClientProvider` rehydrates the query cache from AsyncStorage
  on startup, so cold-launching offline shows the last search.
- `onlineManager` is wired to NetInfo (react-query's default listens for a
  browser `online` event that never fires on native — this is the real bug
  people hit).
- `focusManager` is wired to `AppState` for the same reason.
- `OfflineBanner` renders only when disconnected, marked `role='alert'`.

### Theming
- `ThemeProvider` derives the active palette from `useThemeStore(s => s.mode)`
  (`'system' | 'light' | 'dark'`, persisted) + `useColorScheme()`. Components
  consume via `useTheme()` and build styles inside `useMemo(colors)` so a
  theme flip doesn't force a full remount.
- Palettes are the GitHub Primer light/dark colors — familiar contrast,
  known-good.
- Theme toggle in the Detail screen header cycles system → light → dark
  → system, single tap.

### Networking: `fetch` + `AbortController` (no axios)
- The wrapper is ~90 lines, handles timeout, caller-signal chaining
  (so TanStack Query's query-cancel actually frees the socket), and
  rate-limit detection via `x-ratelimit-remaining`. Axios would add
  weight without adding function.

### Dependencies
Every package in `package.json` is used and justified:
- `@tanstack/react-query` + `@tanstack/react-query-persist-client` +
  `@tanstack/query-async-storage-persister` — server state & offline cache.
- `@shopify/flash-list` — perf-tier list.
- `@react-navigation/native` + `@react-navigation/native-stack` — navigation
  with native transitions.
- `react-native-screens`, `react-native-gesture-handler`,
  `react-native-safe-area-context` — required peers for react-navigation.
- `expo-image` — disk-cached images (first-party swap for `react-native-fast-image`
  in the Expo runtime).
- `expo-linking` — `Linking.openURL` inside the Expo module surface.
- `zod` — API boundary validation, source of TS types.
- `zustand` — client state slices.
- `@react-native-async-storage/async-storage` — persistence layer for
  Zustand + TanStack.
- `@react-native-community/netinfo` — connectivity signal for
  `onlineManager` and the offline banner.
- Dev: `jest` + `jest-expo`, `@testing-library/react-native`,
  `babel-plugin-module-resolver` (path alias `@` → `src`).

---

## Performance

Measurements are pending — see "Verification status" above. Once run on a
device the intended captures are:

1. Cold-start TTI via `react-native-performance` (or Expo's built-in timing).
2. FPS while scrolling a 500-item search result via the Perf Monitor.
3. `react-devtools` Profiler flame chart, before/after the `React.memo` +
   selector-subscription work on `RepositoryCard`, to confirm typing in the
   search box does not re-render the list body.

The optimizations already in the code:
- Hoisted `keyExtractor` + `renderItem` and memoized `RepositoryCard` so
  cell recycling isn't defeated by fresh function refs.
- `removeClippedSubviews` on `FlashList`.
- Fixed image dimensions (`expo-image` never triggers a layout shift).
- Selector-based Zustand subscriptions so a favorite toggle re-renders
  only the affected card, not the whole list.
- `useDebouncedValue` at 350ms — long enough to collapse keystrokes, short
  enough to feel responsive; tuned to keep the unauthenticated Search API
  under its ~10 req/min limit.
- Styles created inside `useMemo(colors)` so a theme flip doesn't create
  new style refs every render, only when colors actually change.

> **Not claiming Flipper:** Flipper was removed from React Native as of
> 0.73 — measurement should be done with `react-devtools` Profiler and
> the built-in Perf Monitor.

---

## Known limitations

- **Unauthenticated rate limit** (~10 req/min for Search). Surfaced to the
  user as a distinct "Rate limit reached" banner. Set `GITHUB_TOKEN` to
  raise to 30/min.
- **1000-result ceiling** on the Search API — the app stops paginating at
  page 10 explicitly (the API would otherwise 422).
- **No E2E tests** — Maestro / Detox would take more than the time budget
  allows.
- **No runtime UI verification** in this environment (no Android SDK). Type
  checks and unit tests pass; the app has not been launched on a device.

---

## What I'd improve with more time

Specific, not generic:

- **E2E with Maestro** — one flow (search → detail → open on GitHub) is
  enough to catch the regressions unit tests won't.
- **GitHub OAuth (device flow)** — lift the rate limit for real users, not
  just developers.
- **CI that builds a preview EAS build on PRs** — Expo makes this trivial.
- **Virtualized avatar cache eviction** — expo-image handles this well, but
  the current settings are defaults; a proper LRU size would matter on
  low-memory devices.
- **Feature-level code splitting via React Navigation `lazy`** — detail
  screen only loads when navigated to; small win, easy to do.
- **Optimistic favorites sync** if backed by a real server later — right
  now favorites are device-local.

---

## Project structure

```
src/
  app/                 # navigation + providers
    navigation/        # RootNavigator, param types
    providers/         # QueryProvider (persist + onlineManager wiring)
  entities/
    repository/
      model/           # Zod schemas + inferred types + fixture
      ui/              # RepositoryCard (memoized, selector-subscribed)
  features/
    repo-search/       # useRepositorySearch (infinite query),
                       # SearchInput / SearchResultsList / SearchScreen
    repo-details/      # useRepositoryDetail (cache-hydrated),
                       # DetailScreen
  shared/
    api/               # fetch client, typed errors, config
    lib/               # useDebouncedValue, useOnlineStatus, formatters
    store/             # 3 Zustand slices + AsyncStorage adapter
    theme/             # palette, ThemeProvider, useTheme
    ui/                # EmptyState, ErrorState, Skeleton,
                       # OfflineBanner, ErrorBoundary
```

The layering is deliberately shallow — `entities` and `features` are enough
to keep the intent clear without stacking empty FSD layers.
