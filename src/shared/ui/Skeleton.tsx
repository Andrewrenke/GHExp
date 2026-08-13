import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View, type ViewStyle} from 'react-native';
import {useTheme} from '@/shared/theme/ThemeProvider';

type Props = {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle;
};

// Skeletons > spinners on first paint because they hint at layout;
// the eventual content lands without a visible reflow.
export const Skeleton = React.memo(function SkeletonImpl({
  height,
  width,
  radius = 4,
  style,
}: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const {colors} = useTheme();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0.4, duration: 700, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          height,
          width: width ?? '100%',
          borderRadius: radius,
          opacity,
          backgroundColor: colors.skeleton,
        },
        style,
      ]}
    />
  );
});

export const RepositoryCardSkeleton = React.memo(function RepositoryCardSkeletonImpl() {
  return (
    <View style={styles.row}>
      <Skeleton height={40} width={40} radius={20} />
      <View style={styles.column}>
        <Skeleton height={14} width="60%" />
        <Skeleton height={12} width="90%" style={styles.spacer} />
        <Skeleton height={12} width="40%" style={styles.spacer} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {flexDirection: 'row', padding: 16, gap: 12},
  column: {flex: 1, justifyContent: 'center'},
  spacer: {marginTop: 8},
});
