@AGENTS.md

# GitHubExplorer — agent instructions

GitHub repository search app. Expo SDK 57, React Native 0.86.2, React 19.2.3,
New Architecture, TypeScript strict. **Android + iOS only — there is no web
target.**

Read this file before changing anything. It records decisions that are easy to
undo by accident and expensive to rediscover.

---

## Non-negotiables

1. **`npm run verify` must pass before you call anything done.** It runs
   typecheck → lint → tests. Do not report success on tests alone: `tsc` and
   ESLint routinely catch what Jest cannot.
2. **Never weaken a gate to make it pass.** No `any`, no `@ts-ignore`, no
   `eslint-disable` without a comment saying why it is unavoidable. The repo
   currently has **zero** `any`, `@ts-ignore` and non-null assertions — keep it
   that way.
3. **Verify UI changes on a device**, not just in tests. Jest renders with
   FlashList mocked and no native modules; several real bugs in this project's
   history were invisible to a green test run.
4. **Never hand-edit `ios/` or `android/`.** Both are gitignored and generated.
   Change `app.json` and re-run `npx expo prebuild`. Note that prebuild _clears_
   the native directories even without `--clean`, and wipes
   `android/local.properties` (recreate with `sdk.dir=$HOME/Library/Android/sdk`).
5. **Read the SDK 57 docs before writing Expo code** — see AGENTS.md. Do not
   trust training data for Expo/RN APIs; several here changed recently.

---

## Commands

```bash
npm run verify        # typecheck + lint + tests — the gate CI runs
npm run typecheck     # tsc --noEmit
npm run lint          # eslint . (fails on error; verified to actually fail)
npm run format        # prettier --write .
npm test              # jest
npm run android       # build + install dev build
npm run ios           # build + install dev build
npm start             # Metro (dev build must already be installed)
```

**Expo Go does not work** — `react-native-mmkv` is native. A dev build is required.

`npm install` needs `--legacy-peer-deps`: SDK 57 pins `react@19.2.3` while
`react-test-renderer` resolves higher and peer-demands `^19.2.8`.

---

## Architecture

Feature-Sliced-ish, deliberately shallow. **Dependencies point one way only:**

```
app  →  features  →  entities  →  shared
```

| Layer       | Contains                                                    | Rule                                                 |
| ----------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `app/`      | Navigator, providers                                        | May import anything below                            |
| `features/` | `repo-search`, `repo-details` — screens + their query hooks | **Never import another feature.** Never import `app` |
| `entities/` | `repository` — Zod schema + `RepositoryCard`                | Domain model shared by features                      |
| `shared/`   | api, store, theme, lib, ui, navigation types                | Imports nothing from above                           |

**Enforcement is manual — there is no lint rule for this.** If you add a layer
violation, nothing will stop you. Check the direction by hand when adding
imports. `RootStackParamList` lives in `shared/navigation/types.ts`
specifically because screens in `features` need it and importing it from `app`
inverted the arrow.

### Where things go

- New screen → `features/<name>/ui/`, its data hook → `features/<name>/api/`
- Reused across features → `shared/ui` or `shared/lib`
- Touches the repository domain → `entities/repository`
- Every cache key → `shared/api/queryKeys.ts`. Never inline a key literal.

---

## The core thesis: server state vs client state

**Server state → TanStack Query. Client state → Zustand. They never duplicate.**

Favorites persist only the `owner/repo` string; the `Repository` object stays in
the query cache. If you find yourself copying API data into a Zustand store,
stop — that is the mistake this design exists to prevent.

- Search: `useInfiniteQuery`, `per_page=100`, hard stop at the API's 1000-result
  ceiling (`getNextSearchPage`, unit-tested — page 11 would 422).
- Detail hydrates from the search cache with **`placeholderData`, never
  `initialData`**. `initialData` writes the partial list-level object into the
  detail cache, the persister sends it to MMKV, and a later offline launch
  serves that half-filled record as if it were a real detail response.
- `queryClient` is created by a factory, not a module singleton, so tests get a
  clean cache. Inject via the `client` prop on `QueryProvider`.

---

## Platform landmines (each one cost real debugging time)

**Hermes on Android ships a partial `Intl`.** `Intl.NumberFormat` and
`DateTimeFormat` exist; **`Intl.RelativeTimeFormat` does not**. Constructing it
at module scope threw `undefined cannot be used as a constructor` at load and
killed the app before first render — a blank screen with no usable stack. See
the feature-detect + fallback in `shared/lib/formatters.ts` and the regression
test that deletes the API and re-imports the module. **Feature-detect any `Intl`
API beyond NumberFormat/DateTimeFormat.**

**`userInterfaceStyle` must stay `"automatic"` in app.json.** Setting `"light"`
writes `UIUserInterfaceStyle = Light` into `Info.plist`, which pins iOS to light
forever and makes the entire dark palette unreachable. It also suppressed live
theme changes on Android.

**`SafeAreaView` with no `edges` prop means _all_ edges, not none.** Screens sit
under the navigator's header, which already owns the top inset — always pass
`edges` explicitly or you get a dead gap.

**`React.lazy` + dynamic `import()` crashes** with
`Cannot read property 'reload' of undefined` under Metro. Code-splitting a
screen was tried and reverted. native-stack mounts screens on navigation
anyway, so there is little to gain.

**FlashList recycles cells** — any `expo-image` inside a list row needs
`recyclingKey`, or it paints the previous row's image until the new one decodes.

---

## Errors

Typed hierarchy in `shared/api/errors.ts`:
`NetworkError | TimeoutError | RateLimitError | ApiError | SchemaError`.

- **Match with the exported `isXxxError()` guards, never `err.name === '...'`.**
  String comparison type-checks against any object and rots on rename.
- The guards use `instanceof` **plus a structural fallback** — that fallback is
  load-bearing, because the prototype chain is genuinely lost after a Metro hot
  reload and after a JSON round-trip out of the persisted cache.
- User-facing text goes through `toUserMessage()`. A `SchemaError` is our bug —
  it must not leak Zod's parser output to a user who cannot act on it.
- A 403 is only a rate limit when `x-ratelimit-remaining` is `0`. A 403 for any
  other reason must stay an `ApiError`, or the retry policy suppresses a real
  failure.

**ErrorBoundary** (`shared/ui/ErrorBoundary.tsx`) supports `fallback`,
`onError`, `onReset`, `resetKeys`, and is applied **per route** in
`RootNavigator`. Keep it that way: a crash in Detail must not cost the user
their search results. `onError` is the seam for Sentry — wire a logger there
rather than editing the component.

---

## Storage

MMKV (`shared/store/storage.ts`), synchronous, wrapped by the typed zustand
adapter in `shared/store/persist.ts`. Query cache uses
`createSyncStoragePersister` over the same instance.

- Synchronous reads are the point: stores rehydrate **before first paint**.
  AsyncStorage landed a tick late and flashed default theme / empty favorites.
- A corrupt entry must return `null`, not throw — covered by a test that writes
  truncated JSON. Preserve that behavior.
- Jest mocks MMKV in `jest.setup.js` with an in-memory Map: importing it for
  real evaluates Nitro native bindings and throws in the test env.

---

## Testing

**52 tests, 10 suites, ~70% statements**, thresholds enforced in `jest.config.js`
and in CI. Do not lower a threshold to land a change.

Where to test what:

- Pure logic (schemas, pagination boundary, formatters, store transitions) —
  plain unit tests.
- The fetch client — stub `globalThis.fetch` via `jest.spyOn`. Cover timeout vs.
  caller-cancel (both surface as `AbortError`; conflating them reports a user's
  navigation as a timeout).
- Components — `@testing-library/react-native`. `ThemeToggle` is icon-only, so
  assert `accessibilityLabel`, not text.
- **FlashList is mocked to `FlatList`** in `jest.setup.js`; its async layout
  commits state outside React's test scheduler and produces `act()` warnings no
  amount of awaiting removes. Recycling behavior belongs in E2E, not jsdom.

---

## UI conventions

- Icons: **Octicons** from `@expo/vector-icons` (GitHub's own set). No text
  glyphs like `★` — they render in the platform emoji font and cannot be sized
  or aligned against adjacent text.
- Icons are `accessible={false}`; the surrounding label or count carries the
  meaning. When a control is icon-only its `accessibilityLabel` becomes
  load-bearing — assert it in a test.
- Styles come from `makeStyles(colors)` + `useMemo`, never module-scope
  `StyleSheet.create` for themed values.
- Both screens use the navigator header with `ThemeToggle` in `headerRight`,
  declared once in `screenOptions`. Do not hand-roll a header row — that is what
  made the two toggles look different.
- Every user-facing string is hard-coded English. There is **no i18n seam**;
  adding one is a real task, not a find-replace.

---

## React 19 / React Compiler

`eslint-config-expo` ships the React Compiler-era `react-hooks` rules
(`purity`, `immutability`, `preserve-manual-memoization`, `set-state-in-effect`,
…) as **errors**, and lint passes clean — so this codebase already satisfies the
Rules of React that the compiler requires.

**The compiler itself is not enabled** (no `experiments.reactCompiler` in
app.json). To enable: install `babel-plugin-react-compiler`, set
`experiments.reactCompiler: true`, rebuild, verify on device.

Until then **keep the manual memoization** — `React.memo`, `useCallback`,
`useMemo` are load-bearing here and `preserve-manual-memoization` will error if
you strip them piecemeal. Memoization is only safe to remove _after_ the
compiler is on and you have before/after measurements.

Note the recurring dependency bug this codebase already fixed twice: TanStack's
result object gets a **new identity every render**, so `[search]` as a
`useCallback` dependency defeats the memoization entirely. Depend on the
specific fields you read.

---

## State of the project

Verified on Android (Pixel 7 API 36): search, detail, favorites across cold
start, theme cycle + persistence, offline banner, and the rate-limit path
against a genuine GitHub 403. iOS **compiles** (`BUILD SUCCEEDED`, Xcode 26.6,
MMKV pods linked) but has **never been exercised at runtime** — treat
iOS-specific rendering as unverified.

Known gaps, in rough priority order:

1. No performance measurements. Everything in the README's Performance section
   is reasoned, not benchmarked. Cold-start TTI (`adb shell am start -W` on a
   release build) and FPS on a long fling would replace intent with data.
2. No E2E (Maestro would cover search → detail → open).
3. No crash reporting — `ErrorBoundary.onError` is waiting for Sentry.
4. No i18n.
5. `GITHUB_TOKEN` is inlined by Metro from `process.env` with no validation;
   `expo-secure-store` + a Zod-checked config would be the fix.

Do not silently "fix" these by adding a dependency mid-task — they are scoped
pieces of work.

---

## Working style expected here

- Say what you actually verified and what you did not. "Tests pass" is not
  "it works"; "it builds" is not "it runs".
- When a plan item turns out to be wrong, revert it and record why. The
  `React.lazy` revert and the `initialData` → `placeholderData` correction are
  both documented in the README because the reasoning matters more than the
  diff.
- Prefer deleting to commenting out. This repo has no dead code and no unused
  exports — a periodic audit is cheap; keep it clean.
