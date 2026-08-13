import React, {useMemo} from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type {RootStackParamList} from '@/shared/navigation/types';
import {ErrorBoundary} from '@/shared/ui/ErrorBoundary';
import {ThemeToggle} from '@/shared/ui/ThemeToggle';
import {SearchScreen} from '@/features/repo-search/ui/SearchScreen';
import {DetailScreen} from '@/features/repo-details/ui/DetailScreen';
import {useTheme} from '@/shared/theme/ThemeProvider';

const Stack = createNativeStackNavigator<RootStackParamList>();

type DetailProps = NativeStackScreenProps<RootStackParamList, 'Detail'>;

// Map our palette onto react-navigation's Theme so screen headers and
// the container background respect the active theme without any
// separate wiring at the screen level.
function toNavTheme(
  colors: ReturnType<typeof useTheme>['colors'],
  scheme: 'light' | 'dark',
): NavTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };
}

// Per-screen boundaries. The root boundary in App.tsx still catches anything
// that escapes, but a render crash inside Detail should cost you the Detail
// screen — not the whole app including your search results. `resetKeys` on the
// route params means navigating to a different repo clears a previous crash
// automatically, without the user having to press anything.
//
// Detail was briefly code-split with React.lazy + a dynamic import. That threw
// "Cannot read property 'reload' of undefined" on first navigation under Metro,
// so it has been reverted to a static import: native-stack already defers
// *mounting* a screen until you navigate to it, and the only thing the split
// added was deferring module evaluation — not worth a crash on the primary
// navigation path. `freezeOnBlur` below is where the actual win is.
function DetailRoute(props: DetailProps) {
  const {owner, name} = props.route.params;
  return (
    <ErrorBoundary resetKeys={[owner, name]}>
      <DetailScreen {...props} />
    </ErrorBoundary>
  );
}

function SearchRoute() {
  return (
    <ErrorBoundary>
      <SearchScreen />
    </ErrorBoundary>
  );
}

export function RootNavigator() {
  const {colors, scheme} = useTheme();
  const navTheme = useMemo(() => toNavTheme(colors, scheme), [colors, scheme]);
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          // A blurred screen's React tree is frozen, so a background refetch on
          // Detail can't re-render behind the search list.
          freezeOnBlur: true,
          // Both screens render the navigator's own header with ThemeToggle on
          // the right. Search previously ran with headerShown: false and drew a
          // hand-rolled title row instead, so the same control appeared in two
          // different designs — different type scale, padding and vertical
          // alignment — depending on which screen you were on.
          headerRight: () => <ThemeToggle />,
        }}>
        <Stack.Screen name="Search" component={SearchRoute} options={{title: 'Repositories'}} />
        <Stack.Screen
          name="Detail"
          component={DetailRoute}
          options={({route}) => ({
            title: `${route.params.owner}/${route.params.name}`,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
