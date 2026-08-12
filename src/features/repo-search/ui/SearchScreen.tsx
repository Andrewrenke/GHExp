import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SearchInput} from './SearchInput';
import {SearchResultsList} from './SearchResultsList';
import {useRepositorySearch} from '@/features/repo-search/api/useRepositorySearch';
import {useDebouncedValue} from '@/shared/lib/useDebouncedValue';
import {EmptyState} from '@/shared/ui/EmptyState';
import {ErrorState} from '@/shared/ui/ErrorState';
import {OfflineBanner} from '@/shared/ui/OfflineBanner';
import {RepositoryCardSkeleton} from '@/shared/ui/Skeleton';
import type {RootStackParamList} from '@/app/navigation/types';
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

  const search = useRepositorySearch(debouncedQuery);

  // Persist a term to history only once its results actually resolve
  // — that way typos and half-typed searches don't pollute the list.
  useEffect(() => {
    if (search.isSuccess && debouncedQuery) {
      pushHistory(debouncedQuery);
    }
  }, [search.isSuccess, debouncedQuery, pushHistory]);

  const items = useMemo(
    () => search.data?.pages.flatMap(p => p.items) ?? [],
    [search.data],
  );

  const handlePressItem = useCallback(
    (item: Repository) => {
      navigation.navigate('Detail', {owner: item.owner.login, name: item.name});
    },
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (search.hasNextPage && !search.isFetchingNextPage) {
      search.fetchNextPage();
    }
  }, [search]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <OfflineBanner />
      <SearchInput value={query} onChangeText={setQuery} />
      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );

  function renderBody() {
    if (debouncedQuery.length === 0) {
      return (
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
      const err = search.error as {name?: string; message?: string} | null;
      const isRateLimit = err?.name === 'RateLimitError';
      return (
        <ErrorState
          title={isRateLimit ? 'Rate limit reached' : 'Something went wrong'}
          message={err?.message ?? 'Please try again.'}
          onRetry={() => search.refetch()}
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
