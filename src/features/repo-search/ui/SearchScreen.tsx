import React, {useCallback, useMemo, useState} from 'react';
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
import {RepositoryCardSkeleton} from '@/shared/ui/Skeleton';
import type {RootStackParamList} from '@/app/navigation/types';
import type {Repository} from '@/entities/repository/model/schema';
import {colors} from '@/shared/theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export function SearchScreen() {
  const [query, setQuery] = useState('');
  // 350ms sits in the middle of the "feels responsive but doesn't
  // burn the rate limit on every keystroke" window.
  const debouncedQuery = useDebouncedValue(query, 350);
  const navigation = useNavigation<Nav>();

  const search = useRepositorySearch(debouncedQuery);

  const items = useMemo(
    () => search.data?.pages.flatMap(p => p.items) ?? [],
    [search.data],
  );

  const handlePressItem = useCallback(
    (item: Repository) => {
      navigation.navigate('Detail', {
        owner: item.owner.login,
        name: item.name,
      });
    },
    [navigation],
  );

  const handleEndReached = useCallback(() => {
    if (search.hasNextPage && !search.isFetchingNextPage) {
      search.fetchNextPage();
    }
  }, [search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
  container: {flex: 1, backgroundColor: colors.background},
  body: {flex: 1},
});
