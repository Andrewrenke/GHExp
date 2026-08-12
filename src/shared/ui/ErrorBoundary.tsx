import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

type Props = {children: React.ReactNode};
type State = {error: Error | null};

// Root-level boundary so a render-time crash in any screen falls back
// to a readable message instead of a native white screen. There's no
// remote logger wired up on purpose — installing Sentry would be work
// outside the assignment's scope.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong.</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Palette-agnostic: this may render before ThemeProvider mounts if the
// crash is very early, so we stick to hard-coded neutral colors here.
const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff'},
  title: {fontSize: 18, fontWeight: '600', color: '#1f2328'},
  message: {marginTop: 8, fontSize: 14, color: '#59636e', textAlign: 'center'},
});
