import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Image} from 'expo-image';
import type {Repository} from '@/entities/repository/model/schema';
import {colors} from '@/shared/theme/colors';
import {formatCount, formatRelative} from '@/shared/lib/formatters';

type Props = {
  item: Repository;
  onPress: (item: Repository) => void;
};

// Memoized so scroll doesn't re-render every card whenever the parent
// (search screen) re-renders on keystrokes. The `onPress` handler is
// stabilized in the parent via useCallback so this memo actually holds.
export const RepositoryCard = React.memo(function RepositoryCardImpl({item, onPress}: Props) {
  const handlePress = React.useCallback(() => onPress(item), [item, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.full_name}`}
      style={({pressed}) => [styles.container, pressed && styles.pressed]}>
      <Image
        source={{uri: item.owner.avatar_url}}
        style={styles.avatar}
        cachePolicy="disk"
        contentFit="cover"
        transition={150}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.full_name}
        </Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.metaStar}>★ {formatCount(item.stargazers_count)}</Text>
          {item.language ? (
            <Text style={styles.meta} numberOfLines={1}>
              {item.language}
            </Text>
          ) : null}
          <Text style={styles.meta} numberOfLines={1}>
            {formatRelative(item.updated_at)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

// Styles hoisted out of render — every inline object would otherwise
// break FlashList's cell recycling and force a re-layout per row.
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.skeleton,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaStar: {
    fontSize: 12,
    color: colors.star,
    fontWeight: '600',
  },
});
