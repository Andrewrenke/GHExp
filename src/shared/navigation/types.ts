// Nav params carry only what /repos/{owner}/{name} needs. The full
// repository object stays in the query cache (source of truth) rather
// than being duplicated through the route.
//
// Lives in `shared`, not `app`: screens in `features` need these types, and
// having them import from `app` inverted the dependency direction
// (app -> features -> entities -> shared). The route contract is shared
// vocabulary; the navigator that implements it stays in `app`.
export type RootStackParamList = {
  Search: undefined;
  Detail: {owner: string; name: string};
};
