import {useQuery, useQueryClient} from '@tanstack/react-query';
import {requestJson} from '@/shared/api/client';
import {
  repositoryDetailSchema,
  type Repository,
  type RepositoryDetail,
} from '@/entities/repository/model/schema';

// Detail is keyed on owner/name (not id) because that's what the URL
// path uses and what the list navigates with — id would force us to
// carry the whole object through the route, which the plan explicitly
// avoids.
export function detailQueryKey(owner: string, name: string) {
  return ['repository', owner, name] as const;
}

export function useRepositoryDetail(owner: string, name: string) {
  const queryClient = useQueryClient();

  // Hydrate instantly from the search cache so the detail screen
  // paints with the list-level fields (name, description, stars,
  // avatar) while the fuller /repos/{owner}/{name} response comes in
  // in the background. No white flash, no top-level spinner.
  const initialData = findRepoInSearchCache(queryClient, owner, name);

  return useQuery<RepositoryDetail>({
    queryKey: detailQueryKey(owner, name),
    queryFn: ({signal}) =>
      requestJson(`/repos/${owner}/${name}`, repositoryDetailSchema, {signal}),
    initialData: initialData as RepositoryDetail | undefined,
    // If we hydrated from the list, treat it as stale immediately so
    // the background fetch still runs — the list omits topics, license,
    // etc. that only /repos returns.
    staleTime: initialData ? 0 : 60_000,
  });
}

type QueryClientLike = ReturnType<typeof useQueryClient>;

function findRepoInSearchCache(
  queryClient: QueryClientLike,
  owner: string,
  name: string,
): Repository | undefined {
  const fullName = `${owner}/${name}`;
  const caches = queryClient.getQueriesData<{pages: Array<{items: Repository[]}>}>({
    queryKey: ['repositories'],
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
