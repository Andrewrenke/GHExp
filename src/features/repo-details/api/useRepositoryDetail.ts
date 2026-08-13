import {useQuery, useQueryClient} from '@tanstack/react-query';
import {requestJson} from '@/shared/api/client';
import {repositoryDetailSchema, type Repository} from '@/entities/repository/model/schema';
import {queryKeys} from '@/shared/api/queryKeys';

// Detail is keyed on owner/name (not id) because that's what the URL path uses
// and what the list navigates with — id would force us to carry the whole
// object through the route. The key itself lives in the shared factory so the
// search and detail caches can't drift apart.
export function useRepositoryDetail(owner: string, name: string) {
  const queryClient = useQueryClient();

  // Hydrate instantly from the search cache so the detail screen
  // paints with the list-level fields (name, description, stars,
  // avatar) while the fuller /repos/{owner}/{name} response comes in
  // in the background. No white flash, no top-level spinner.
  const cached = findRepoInSearchCache(queryClient, owner, name);

  return useQuery({
    queryKey: queryKeys.repository.detail(owner, name),
    queryFn: ({signal}) => requestJson(`/repos/${owner}/${name}`, repositoryDetailSchema, {signal}),
    // `placeholderData`, not `initialData`. A list-level Repository is
    // assignable to RepositoryDetail (every extra detail field is optional),
    // so this type-checks either way — but `initialData` *writes* the partial
    // object into the detail cache, where the persister then hands it to
    // storage. On the next offline launch that half-filled record is
    // served as a real detail response and, being within staleTime, may never
    // be corrected. `placeholderData` renders the same instant preview without
    // ever entering the cache, and flags itself via `isPlaceholderData`.
    placeholderData: cached,
    staleTime: 60_000,
  });
}

type QueryClientLike = ReturnType<typeof useQueryClient>;

function findRepoInSearchCache(
  queryClient: QueryClientLike,
  owner: string,
  name: string,
): Repository | undefined {
  const fullName = `${owner}/${name}`;
  const caches = queryClient.getQueriesData<{pages: {items: Repository[]}[]}>({
    queryKey: queryKeys.repositories.all,
  });
  for (const [, data] of caches) {
    if (!data) continue;
    for (const page of data.pages) {
      const match = page.items.find(r => r.full_name === fullName);
      if (match) return match;
    }
  }
  return undefined;
}
