import React, {createContext, useContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {useThemeStore} from '@/shared/store/useThemeStore';
import {darkPalette, lightPalette, type Palette} from './palette';

// Two things drive the active palette: the user's stored preference
// ('system' | 'light' | 'dark') and the OS colour scheme. Wiring them
// together in one place means components just call useTheme() —
// no component ever has to know about system-vs-manual mode.

type Theme = {colors: Palette; scheme: 'light' | 'dark'};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const mode = useThemeStore(s => s.mode);
  const system = useColorScheme();

  const value = useMemo<Theme>(() => {
    const scheme: 'light' | 'dark' =
      mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
    return {
      colors: scheme === 'dark' ? darkPalette : lightPalette,
      scheme,
    };
  }, [mode, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return value;
}
