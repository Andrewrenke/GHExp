import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@/shared/theme/ThemeProvider';
import type {Palette} from '@/shared/theme/palette';

type Props = {
  title: string;
  subtitle?: string;
};

export const EmptyState = React.memo(function EmptyStateImpl({title, subtitle}: Props) {
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
});

function makeStyles(colors: Palette) {
  return StyleSheet.create({
    container: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
    title: {fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center'},
    subtitle: {marginTop: 8, fontSize: 14, color: colors.textMuted, textAlign: 'center'},
  });
}
