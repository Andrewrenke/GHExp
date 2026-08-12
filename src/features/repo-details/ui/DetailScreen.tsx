import React, {useCallback} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Image} from 'expo-image';
import * as Linking from 'expo-linking';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useRepositoryDetail} from '@/features/repo-details/api/useRepositoryDetail';
import {ErrorState} from '@/shared/ui/ErrorState';
import {RepositoryCardSkeleton} from '@/shared/ui/Skeleton';
import {colors} from '@/shared/theme/colors';
import {formatCount, formatRelative} from '@/shared/lib/formatters';
import type {RootStackParamList} from '@/app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Detail'>;

export function DetailScreen({route}: Props) {
  const {owner, name} = route.params;
  const {data, isPending, isError, error, refetch} = useRepositoryDetail(owner, name);

  const openOnGitHub = useCallback(() => {
    if (data) Linking.openURL(data.html_url);
  }, [data]);

  if (isPending) {
    return (
      <SafeAreaView style={styles.container}>
        <RepositoryCardSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorState
          title="Could not load repository"
          message={(error as Error | null)?.message}
          onRetry={() => refetch()}
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
        </View>

        {data.description ? (
          <Text style={styles.description}>{data.description}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <Stat label="Stars" value={formatCount(data.stargazers_count)} />
          <Stat label="Forks" value={formatCount(data.forks_count)} />
          <Stat label="Issues" value={formatCount(data.open_issues_count)} />
        </View>

        <View style={styles.metaBlock}>
          {data.language ? <MetaRow label="Language" value={data.language} /> : null}
          {data.license?.name ? (
            <MetaRow label="License" value={data.license.name} />
          ) : null}
          {data.default_branch ? (
            <MetaRow label="Default branch" value={data.default_branch} />
          ) : null}
          <MetaRow label="Updated" value={formatRelative(data.updated_at)} />
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
          <Text style={styles.buttonText}>Open on GitHub</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const Stat = React.memo(function StatImpl({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

const MetaRow = React.memo(function MetaRowImpl({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
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
  stat: {flex: 1, alignItems: 'center'},
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
    alignItems: 'center',
  },
  buttonPressed: {opacity: 0.7},
  buttonText: {color: '#fff', fontWeight: '600', fontSize: 15},
});
