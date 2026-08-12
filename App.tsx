import React from 'react';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {QueryProvider} from '@/app/providers/QueryProvider';
import {RootNavigator} from '@/app/navigation/RootNavigator';

// GestureHandlerRootView must sit above react-navigation so swipe-back
// gestures work; SafeAreaProvider must wrap the navigator so screen
// headers get correct insets on notched devices.
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <QueryProvider>
          <RootNavigator />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = {root: {flex: 1}} as const;
