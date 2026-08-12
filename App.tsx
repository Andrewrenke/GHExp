import React from 'react';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {QueryProvider} from '@/app/providers/QueryProvider';
import {RootNavigator} from '@/app/navigation/RootNavigator';
import {ThemeProvider} from '@/shared/theme/ThemeProvider';
import {ErrorBoundary} from '@/shared/ui/ErrorBoundary';

// GestureHandlerRootView sits above navigation so swipe-back gestures
// work; ErrorBoundary is next-outermost so it can catch renders in
// any provider below it; ThemeProvider wraps navigation so headers
// pick up theme changes without a remount.
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <ThemeProvider>
            <StatusBar style="auto" />
            <QueryProvider>
              <RootNavigator />
            </QueryProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = {root: {flex: 1}} as const;
