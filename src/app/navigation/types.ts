// Nav params carry only what /repos/{owner}/{name} needs. The full
// repository object stays in the query cache (source of truth) rather
// than being duplicated through the route.
export type RootStackParamList = {
  Search: undefined;
  Detail: {owner: string; name: string};
};
