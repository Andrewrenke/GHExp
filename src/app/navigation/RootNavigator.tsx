import React, {useMemo} from 'react';
import {Pressable, Text} from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import {SearchScreen} from '@/features/repo-search/ui/SearchScreen';
import {DetailScreen} from '@/features/repo-details/ui/DetailScreen';
import {useTheme} from '@/shared/theme/ThemeProvider';
import {useThemeStore} from '@/shared/store/useThemeStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Map our palette onto react-navigation's Theme so screen headers and
// the container background respect the active theme without any
// separate wiring at the screen level.
function toNavTheme(colors: ReturnType<typeof useTheme>['colors'], scheme: 'light' | 'dark'): NavTheme {
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

// Cycles system → light → dark → system so the whole preference space
// is reachable from a single tap without a modal or settings screen.
function ThemeToggle() {
  const {colors} = useTheme();
  const mode = useThemeStore(s => s.mode);
  const setMode = useThemeStore(s => s.setMode);
  const label = mode === 'system' ? 'Auto' : mode === 'dark' ? 'Dark' : 'Light';
  return (
    <Pressable
      onPress={() =>
        setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system')
      }
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Theme: ${label}. Tap to change.`}>
      <Text style={{color: colors.accent, fontWeight: '600'}}>{label}</Text>
    </Pressable>
  );
}

export function RootNavigator() {
  const {colors, scheme} = useTheme();
  const navTheme = useMemo(() => toNavTheme(colors, scheme), [colors, scheme]);
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator>
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{title: 'Repositories', headerShown: false}}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={({route}) => ({
            title: `${route.params.owner}/${route.params.name}`,
            headerRight: () => <ThemeToggle />,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
