import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Image} from 'expo-image';
import type {Repository} from '@/entities/repository/model/schema';
import {useTheme} from '@/shared/theme/ThemeProvider';
import type {Palette} from '@/shared/theme/palette';
import {formatCount, formatRelative} from '@/shared/lib/formatters';
import {useFavoritesStore} from '@/shared/store/useFavoritesStore';

type Props = {
  item: Repository;
  onPress: (item: Repository) => void;
};

// Memoized: scroll must not re-render every card on parent updates
// (keystrokes in the search box, theme change, etc.). onPress is
// stabilized in the parent via useCallback so this memo actually holds.
export const RepositoryCard = React.memo(function RepositoryCardImpl({item, onPress}: Props) {
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const handlePress = React.useCallback(() => onPress(item), [item, onPress]);

  // Selector-only subscription: this card only re-renders when the
  // favorite status of *this* repo changes, not on any other toggle.
  const isFavorite = useFavoritesStore(s => s.favorites.includes(item.full_name));
  const toggleFavorite = useFavoritesStore(s => s.toggle);

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
      <Pressable
        onPress={() => toggleFavorite(item.full_name)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        style={styles.favBtn}>
        <Text style={[styles.favIcon, {color: isFavorite ? colors.star : colors.textMuted}]}>
          {isFavorite ? '★' : '☆'}
        </Text>
      </Pressable>
    </Pressable>
  );
});

function makeStyles(colors: Palette) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      alignItems: 'flex-start',
    },
    pressed: {backgroundColor: colors.surface},
    avatar: {width: 40, height: 40, borderRadius: 20, backgroundColor: colors.skeleton},
    body: {flex: 1, minWidth: 0},
    name: {fontSize: 15, fontWeight: '600', color: colors.accent},
    description: {marginTop: 4, fontSize: 13, color: colors.text, lineHeight: 18},
    metaRow: {marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap'},
    meta: {fontSize: 12, color: colors.textMuted},
    metaStar: {fontSize: 12, color: colors.star, fontWeight: '600'},
    favBtn: {padding: 4},
    favIcon: {fontSize: 22, lineHeight: 24},
  });
}
