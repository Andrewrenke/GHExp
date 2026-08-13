import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Octicons from '@expo/vector-icons/Octicons';
import {useOnlineStatus} from '@/shared/lib/useOnlineStatus';
import {useTheme} from '@/shared/theme/ThemeProvider';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const {colors} = useTheme();
  if (online) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Showing cached results."
      style={[styles.bar, {backgroundColor: colors.offlineBar}]}>
      <Octicons name="alert" size={12} color={colors.offlineBarText} accessible={false} />
      <Text style={[styles.text, {color: colors.offlineBarText}]}>
        Offline — showing cached results
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
