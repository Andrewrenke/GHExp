import React from 'react';
import {Appearance, Pressable, StyleSheet, Text, View} from 'react-native';
import {darkPalette, lightPalette, type Palette} from '@/shared/theme/palette';

type FallbackProps = {
  error: Error;
  resetError: () => void;
};

type Props = {
  children: React.ReactNode;
  /** Custom fallback UI. Receives `resetError` so callers can offer recovery. */
  fallback?: (props: FallbackProps) => React.ReactNode;
  /** Reporting seam — wire a real logger (Sentry et al.) here without editing this file. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Called after the user (or a resetKeys change) clears the error. */
  onReset?: () => void;
  /**
   * Clears the error whenever any value changes. Pass route params so a crash
   * on one repo doesn't persist after navigating to a different one.
   */
  resetKeys?: readonly unknown[];
};

type State = {error: Error | null};

// A boundary a user can escape from. The previous version rendered the error
// and stopped there — with no reset path the only way out of a transient
// render crash was to kill and relaunch the app.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Kept as the local fallback so a crash is never silent in dev; `onError`
    // is the seam for shipping this somewhere real.
    console.error('ErrorBoundary caught', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: Props) {
    const {resetKeys} = this.props;
    if (!this.state.error || !resetKeys) return;

    const prevKeys = prevProps.resetKeys ?? [];
    const changed =
      prevKeys.length !== resetKeys.length ||
      resetKeys.some((key, i) => !Object.is(key, prevKeys[i]));

    if (changed) this.resetError();
  }

  resetError = () => {
    this.setState({error: null});
    this.props.onReset?.();
  };

  render() {
    const {error} = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({error, resetError: this.resetError});
    }
    return <DefaultFallback error={error} resetError={this.resetError} />;
  }
}

// This can render before ThemeProvider mounts (an early crash), so it can't use
// useTheme(). It reads the OS scheme directly instead of hard-coding light —
// the previous version always painted #fff, which flash-banged dark-mode users
// at the exact moment something had already gone wrong.
function DefaultFallback({error, resetError}: FallbackProps) {
  const colors: Palette = Appearance.getColorScheme() === 'dark' ? darkPalette : lightPalette;
  const styles = makeStyles(colors);

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>Something went wrong.</Text>
      <Text style={styles.message}>
        The screen failed to render. You can try again — if it keeps happening, restart the app.
      </Text>
      {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
      <Pressable
        onPress={resetError}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      backgroundColor: colors.background,
    },
    title: {fontSize: 18, fontWeight: '600', color: colors.text},
    message: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    // The raw message is dev-only: in production it leaks internals to a user
    // who can't act on them.
    detail: {
      marginTop: 12,
      fontSize: 12,
      color: colors.danger,
      textAlign: 'center',
    },
    button: {
      marginTop: 20,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    buttonPressed: {opacity: 0.6},
    buttonText: {fontSize: 15, fontWeight: '600', color: colors.accent},
  });
}
