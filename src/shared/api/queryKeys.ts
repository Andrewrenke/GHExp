// One place that owns every cache key. Keys were previously inline literals
// (`['repositories', trimmed]` in the search hook, `['repository', owner, name]`
// in the detail hook, and a bare `['repositories']` prefix used for cache
// lookups). That works until two call sites disagree by one character, at which
// point invalidation silently stops matching and the bug looks like "stale data
// sometimes". Centralising them also makes the prefix relationship explicit:
// `repositories.search(q)` is nested under `repositories.all` so a single
// invalidate can clear every search.
export const queryKeys = {
  repositories: {
    all: ['repositories'] as const,
    search: (query: string) => [...queryKeys.repositories.all, query] as const,
  },
  repository: {
    all: ['repository'] as const,
    detail: (owner: string, name: string) => [...queryKeys.repository.all, owner, name] as const,
  },
} as const;
