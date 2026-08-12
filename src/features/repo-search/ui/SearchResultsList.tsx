import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {FlashList, type ListRenderItem} from '@shopify/flash-list';
import type {Repository} from '@/entities/repository/model/schema';
import {RepositoryCard} from '@/entities/repository/ui/RepositoryCard';
import {useTheme} from '@/shared/theme/ThemeProvider';

type Props = {
  data: readonly Repository[];
  onPressItem: (item: Repository) => void;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
};

const keyExtractor = (item: Repository) => String(item.id);

export function SearchResultsList({data, onPressItem, onEndReached, isFetchingNextPage}: Props) {
  const {colors} = useTheme();
  const renderItem = React.useCallback<ListRenderItem<Repository>>(
    ({item}) => <RepositoryCard item={item} onPress={onPressItem} />,
    [onPressItem],
  );

  const ListFooter = React.useMemo(
    () =>
      isFetchingNextPage ? (
        <View style={[styles.footer, {backgroundColor: colors.background}]}>
          <ActivityIndicator />
        </View>
      ) : null,
    [isFetchingNextPage, colors.background],
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
  footer: {paddingVertical: 20, alignItems: 'center'},
});
