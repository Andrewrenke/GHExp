import React, {useCallback, useMemo} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Image} from 'expo-image';
import Octicons from '@expo/vector-icons/Octicons';
import * as Linking from 'expo-linking';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useRepositoryDetail} from '@/features/repo-details/api/useRepositoryDetail';
import {isRateLimitError, toUserMessage} from '@/shared/api/errors';
import {ErrorState} from '@/shared/ui/ErrorState';
import {RepositoryCardSkeleton} from '@/shared/ui/Skeleton';
import {useTheme} from '@/shared/theme/ThemeProvider';
import type {Palette} from '@/shared/theme/palette';
import {formatCount, formatRelative} from '@/shared/lib/formatters';
import type {RootStackParamList} from '@/shared/navigation/types';
import {useFavoritesStore} from '@/shared/store/useFavoritesStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

export function DetailScreen({route}: Props) {
  const {owner, name} = route.params;
  const {data, isPending, isError, error, refetch} = useRepositoryDetail(owner, name);
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const fullName = `${owner}/${name}`;
  const isFavorite = useFavoritesStore(s => s.favorites.includes(fullName));
  const toggleFavorite = useFavoritesStore(s => s.toggle);

  // Depend on the URL string rather than the whole `data` object, which gets a
  // new identity on every background refetch.
  const htmlUrl = data?.html_url;

  const openOnGitHub = useCallback(() => {
    if (!htmlUrl) return;
    // openURL rejects when no handler is registered for the scheme (and on
    // Android when the intent is blocked). Unhandled, that surfaces as a red
    // box in dev and a silent unhandled rejection in production.
    Linking.openURL(htmlUrl).catch(() => {
      Alert.alert('Could not open link', 'No app on this device can open GitHub links.');
    });
  }, [htmlUrl]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <SafeAreaView style={styles.container}>
        <RepositoryCardSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ErrorState
          title={isRateLimitError(error) ? 'Rate limit reached' : 'Could not load repository'}
          message={toUserMessage(error)}
          onRetry={handleRetry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image
            source={{uri: data.owner.avatar_url}}
            style={styles.avatar}
            cachePolicy="disk"
            contentFit="cover"
          />
          <View style={styles.headerText}>
            <Text style={styles.owner}>{data.owner.login}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {data.name}
            </Text>
          </View>
          <Pressable
            onPress={() => toggleFavorite(fullName)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
            <Octicons
              name={isFavorite ? 'star-fill' : 'star'}
              size={24}
              color={isFavorite ? colors.star : colors.textMuted}
              accessible={false}
            />
          </Pressable>
        </View>

        {data.description ? <Text style={styles.description}>{data.description}</Text> : null}

        <View style={styles.statsRow}>
          <Stat
            icon="star-fill"
            label="Stars"
            value={formatCount(data.stargazers_count)}
            styles={styles}
            colors={colors}
          />
          <Stat
            icon="repo-forked"
            label="Forks"
            value={formatCount(data.forks_count)}
            styles={styles}
            colors={colors}
          />
          <Stat
            icon="issue-opened"
            label="Issues"
            value={formatCount(data.open_issues_count)}
            styles={styles}
            colors={colors}
          />
        </View>

        <View style={styles.metaBlock}>
          {data.language ? (
            <MetaRow label="Language" value={data.language} styles={styles} />
          ) : null}
          {data.license?.name ? (
            <MetaRow label="License" value={data.license.name} styles={styles} />
          ) : null}
          {data.default_branch ? (
            <MetaRow label="Default branch" value={data.default_branch} styles={styles} />
          ) : null}
          <MetaRow label="Updated" value={formatRelative(data.updated_at)} styles={styles} />
        </View>

        {data.topics && data.topics.length > 0 ? (
          <View style={styles.topics}>
            {data.topics.map(t => (
              <Text key={t} style={styles.topic}>
                {t}
              </Text>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={openOnGitHub}
          accessibilityRole="button"
          accessibilityLabel={`Open ${data.full_name} on GitHub`}
          style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}>
          <Octicons name="mark-github" size={18} color="#ffffff" accessible={false} />
          <Text style={styles.buttonText}>Open on GitHub</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type StylesShape = ReturnType<typeof makeStyles>;

const Stat = React.memo(function StatImpl({
  icon,
  label,
  value,
  styles,
  colors,
}: {
  icon: React.ComponentProps<typeof Octicons>['name'];
  label: string;
  value: string;
  styles: StylesShape;
  colors: Palette;
}) {
  return (
    // Grouped so a screen reader announces "1.4K Stars" as one unit instead of
    // reading a bare number and its label as two disconnected fragments.
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Octicons name={icon} size={14} color={colors.textMuted} accessible={false} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

const MetaRow = React.memo(function MetaRowImpl({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: StylesShape;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
});

function makeStyles(colors: Palette) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    content: {padding: 16, gap: 16},
    header: {flexDirection: 'row', gap: 12, alignItems: 'center'},
    avatar: {width: 56, height: 56, borderRadius: 28, backgroundColor: colors.skeleton},
    headerText: {flex: 1, minWidth: 0},
    owner: {fontSize: 13, color: colors.textMuted},
    name: {fontSize: 20, fontWeight: '700', color: colors.text},
    description: {fontSize: 14, lineHeight: 20, color: colors.text},
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    stat: {flex: 1, alignItems: 'center', gap: 2},
    statValue: {fontSize: 18, fontWeight: '700', color: colors.text},
    statLabel: {marginTop: 2, fontSize: 12, color: colors.textMuted},
    metaBlock: {gap: 6},
    metaRow: {flexDirection: 'row', justifyContent: 'space-between'},
    metaLabel: {fontSize: 13, color: colors.textMuted},
    metaValue: {fontSize: 13, color: colors.text, fontWeight: '500'},
    topics: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
    topic: {
      fontSize: 12,
      color: colors.accent,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    button: {
      marginTop: 8,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonPressed: {opacity: 0.7},
    buttonText: {color: '#fff', fontWeight: '600', fontSize: 15},
  });
}
