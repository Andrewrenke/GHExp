import {useInfiniteQuery} from '@tanstack/react-query';
import {requestJson} from '@/shared/api/client';
import {isRateLimitError, isSchemaError} from '@/shared/api/errors';
import {queryKeys} from '@/shared/api/queryKeys';
import {searchResponseSchema, type SearchResponse} from '@/entities/repository/model/schema';

const PER_PAGE = 100; // assignment specifies per_page=100

// The Search API caps results at 1000 (10 pages of 100). Requesting page
// 11 returns HTTP 422 with a "only the first 1000 results are available"
// message. Stopping pagination explicitly here means the UI never sees
// that error at all — clean footer, no surprise crash at the boundary.
const SEARCH_MAX_RESULTS = 1000;
export const SEARCH_MAX_PAGES = Math.ceil(SEARCH_MAX_RESULTS / PER_PAGE);

// Exported for direct unit testing — hooks are awkward to test for pure
// pagination logic, and this is the exact kind of off-by-one that will
// bite ad hoc.
export function getNextSearchPage(
  lastPage: SearchResponse,
  allPages: readonly SearchResponse[],
): number | undefined {
  const loaded = allPages.length * PER_PAGE;
  if (loaded >= SEARCH_MAX_RESULTS) {
    return undefined; // hit the 1000-result ceiling
  }
  if (loaded >= lastPage.total_count) {
    return undefined; // ran out of real results
  }
  return allPages.length + 1;
}

export function useRepositorySearch(query: string) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.repositories.search(trimmed),
    queryFn: ({pageParam, signal}) =>
      requestJson(
        `/search/repositories?q=${encodeURIComponent(trimmed)}` +
          `&per_page=${PER_PAGE}&page=${pageParam}`,
        searchResponseSchema,
        {signal},
      ),
    initialPageParam: 1,
    getNextPageParam: getNextSearchPage,
    enabled: trimmed.length > 0,
    // 5 min: search results don't churn per keystroke; keeping them
    // fresh across re-focus avoids re-hitting a rate-limited endpoint.
    staleTime: 5 * 60_000,
    // Retry once on transient errors, but never on a rate limit —
    // retrying a 403 just wastes the remaining quota. A schema failure is
    // deterministic, so retrying it just fails again more slowly.
    retry: (failureCount, err) => {
      if (isRateLimitError(err) || isSchemaError(err)) {
        return false;
      }
      return failureCount < 1;
    },
  });
}
