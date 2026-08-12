// Central config kept small on purpose: pulling in react-native-config
// for a single optional token is overkill. If a token is needed in dev,
// set it here or via the Metro env at build time.

export const API_BASE_URL = 'https://api.github.com';
export const DEFAULT_TIMEOUT_MS = 10_000;

// Optional Personal Access Token to lift the unauthenticated Search API
// limit (~10 req/min) up to 30 req/min. Never ship a real token in git —
// Metro inlines process.env.* at bundle time, so this ends up as a plain
// string (or undefined) in the compiled bundle; no runtime `process` lookup.
declare const process: {env: Record<string, string | undefined>} | undefined;

export const GITHUB_TOKEN: string | undefined =
  typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : undefined;
