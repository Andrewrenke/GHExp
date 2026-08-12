import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@/shared/theme/ThemeProvider';
import type {Palette} from '@/shared/theme/palette';

type Props = {
  title: string;
  message?: string;
  onRetry?: () => void;
};

export const ErrorState = React.memo(function ErrorStateImpl({title, message, onRetry}: Props) {
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

function makeStyles(colors: Palette) {
  return StyleSheet.create({
    container: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32},
    title: {fontSize: 16, fontWeight: '600', color: colors.danger, textAlign: 'center'},
    message: {marginTop: 8, fontSize: 14, color: colors.textMuted, textAlign: 'center'},
    button: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 6,
      backgroundColor: colors.accent,
    },
    buttonPressed: {opacity: 0.7},
    buttonText: {color: '#fff', fontWeight: '600'},
  });
}
