import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {FlashList, type ListRenderItem} from '@shopify/flash-list';
import type {Repository} from '@/entities/repository/model/schema';
import {RepositoryCard} from '@/entities/repository/ui/RepositoryCard';
import {colors} from '@/shared/theme/colors';

type Props = {
  data: readonly Repository[];
  onPressItem: (item: Repository) => void;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
};

// keyExtractor and renderItem are hoisted out of the component so
// FlashList doesn't get a fresh function reference on every parent
// re-render (which defeats memoization of the row).
const keyExtractor = (item: Repository) => String(item.id);

export function SearchResultsList({data, onPressItem, onEndReached, isFetchingNextPage}: Props) {
  const renderItem = React.useCallback<ListRenderItem<Repository>>(
    ({item}) => <RepositoryCard item={item} onPress={onPressItem} />,
    [onPressItem],
  );

  const ListFooter = React.useMemo(
    () =>
      isFetchingNextPage ? (
        <View style={styles.footer}>
          <ActivityIndicator />
        </View>
      ) : null,
    [isFetchingNextPage],
  );

  return (
    <FlashList
      data={data as Repository[]}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={ListFooter}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
