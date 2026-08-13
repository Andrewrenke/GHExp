import React, {useMemo} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@/shared/theme/ThemeProvider';
import type {Palette} from '@/shared/theme/palette';
import {useSearchHistoryStore} from '@/shared/store/useSearchHistoryStore';

type Props = {
  onSelect: (query: string) => void;
};

// The search-history store was previously write-only: every successful search
// was pushed and persisted, but nothing ever read it back. This is the missing
// consumer — either the data earns its persistence by being useful, or the
// store should be deleted.
export const RecentSearches = React.memo(function RecentSearchesImpl({onSelect}: Props) {
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const history = useSearchHistoryStore(s => s.history);
  const clear = useSearchHistoryStore(s => s.clear);

  if (history.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Recent searches</Text>
        <Pressable
          onPress={clear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear recent searches">
          <Text style={styles.clear}>Clear</Text>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled">
        {history.map(query => (
          <Pressable
            key={query}
            onPress={() => onSelect(query)}
            accessibilityRole="button"
            accessibilityLabel={`Search again for ${query}`}
            style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
            <Text style={styles.rowText} numberOfLines={1}>
              {query}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
});

function makeStyles(colors: Palette) {
  return StyleSheet.create({
    container: {flex: 1, paddingTop: 8},
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    heading: {fontSize: 13, fontWeight: '600', color: colors.textMuted},
    clear: {fontSize: 13, fontWeight: '600', color: colors.accent},
    row: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPressed: {backgroundColor: colors.surface},
    rowText: {fontSize: 15, color: colors.text},
  });
}
