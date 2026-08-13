import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SearchInput} from './SearchInput';
import {SearchResultsList} from './SearchResultsList';
import {RecentSearches} from './RecentSearches';
import {useRepositorySearch} from '@/features/repo-search/api/useRepositorySearch';
import {isRateLimitError, toUserMessage} from '@/shared/api/errors';
import {useDebouncedValue} from '@/shared/lib/useDebouncedValue';
import {EmptyState} from '@/shared/ui/EmptyState';
import {ErrorState} from '@/shared/ui/ErrorState';
import {OfflineBanner} from '@/shared/ui/OfflineBanner';
import {RepositoryCardSkeleton} from '@/shared/ui/Skeleton';
import type {RootStackParamList} from '@/shared/navigation/types';
import type {Repository} from '@/entities/repository/model/schema';
import {useTheme} from '@/shared/theme/ThemeProvider';
import {useSearchHistoryStore} from '@/shared/store/useSearchHistoryStore';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export function SearchScreen() {
  const [query, setQuery] = useState('');
  // 350ms sits in the middle of the "feels responsive but doesn't
  // burn the rate limit on every keystroke" window.
  const debouncedQuery = useDebouncedValue(query, 350);
  const navigation = useNavigation<Nav>();
  const {colors} = useTheme();
  const pushHistory = useSearchHistoryStore(s => s.push);
  const history = useSearchHistoryStore(s => s.history);

  const search = useRepositorySearch(debouncedQuery);

  // Persist a term to history only once its results actually resolve
  // — that way typos and half-typed searches don't pollute the list.
  useEffect(() => {
    if (search.isSuccess && debouncedQuery) {
      pushHistory(debouncedQuery);
    }
  }, [search.isSuccess, debouncedQuery, pushHistory]);

  const items = useMemo(() => search.data?.pages.flatMap(p => p.items) ?? [], [search.data]);

  const handlePressItem = useCallback(
    (item: Repository) => {
      navigation.navigate('Detail', {owner: item.owner.login, name: item.name});
    },
    [navigation],
  );

  // Depend on the three fields actually read, not the whole `search` object —
  // that object gets a new identity on every render, so a `[search]` dependency
  // handed FlashList a brand-new onEndReached on every single render.
  const {hasNextPage, isFetchingNextPage, fetchNextPage, refetch} = search;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Stable identity so the memoized ErrorState isn't re-rendered by a fresh
  // inline arrow on every parent render.
  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Edges must be listed explicitly. Omitting the prop entirely does not mean
  // "no insets" — it means *all* of them, which re-applied the status-bar inset
  // underneath the navigator's header and left a visible dead gap above the
  // search field.
  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: colors.background}]}
      edges={['left', 'right', 'bottom']}>
      <OfflineBanner />
      <SearchInput value={query} onChangeText={setQuery} />
      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );

  function renderBody() {
    if (debouncedQuery.length === 0) {
      // Recent searches are more useful than a static hint once the user has
      // any history; fall back to the hint on a first run.
      return history.length > 0 ? (
        <RecentSearches onSelect={setQuery} />
      ) : (
        <EmptyState
          title="Search GitHub"
          subtitle="Try “react-native”, “tanstack query”, or your own username."
        />
      );
    }
    if (search.isPending) {
      return (
        <View>
          {Array.from({length: 6}).map((_, i) => (
            <RepositoryCardSkeleton key={i} />
          ))}
        </View>
      );
    }
    if (search.isError) {
      return (
        <ErrorState
          title={isRateLimitError(search.error) ? 'Rate limit reached' : 'Something went wrong'}
          message={toUserMessage(search.error)}
          onRetry={handleRetry}
        />
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          title="No repositories found"
          subtitle={`No results for “${debouncedQuery}”.`}
        />
      );
    }
    return (
      <SearchResultsList
        data={items}
        onPressItem={handlePressItem}
        onEndReached={handleEndReached}
        isFetchingNextPage={search.isFetchingNextPage}
      />
    );
  }
}

const styles = StyleSheet.create({
  container: {flex: 1},
  body: {flex: 1},
});
