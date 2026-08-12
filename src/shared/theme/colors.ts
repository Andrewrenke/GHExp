// Kept as a plain constant object for now. Phase 5 replaces this with
// a ThemeProvider driven by useThemeStore + useColorScheme(); until
// then, a single light palette is enough to keep the UI honest without
// pretending we already have theming.

export const colors = {
  background: '#ffffff',
  surface: '#f6f8fa',
  border: '#d0d7de',
  text: '#1f2328',
  textMuted: '#59636e',
  accent: '#0969da',
  danger: '#cf222e',
  star: '#d29922',
  skeleton: '#eaeef2',
} as const;

export type ColorToken = keyof typeof colors;
