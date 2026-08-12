import React from 'react';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {QueryProvider} from '@/app/providers/QueryProvider';
import {RootNavigator} from '@/app/navigation/RootNavigator';
import {ThemeProvider} from '@/shared/theme/ThemeProvider';

// GestureHandlerRootView sits above navigation so swipe-back gestures
// work; SafeAreaProvider wraps navigation so headers get correct
// insets; ThemeProvider wraps navigation so screen chrome (headers,
// container background) picks up theme changes without a remount.
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <QueryProvider>
            <RootNavigator />
          </QueryProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = {root: {flex: 1}} as const;
