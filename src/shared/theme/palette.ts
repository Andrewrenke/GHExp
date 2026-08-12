// Two palettes with the same token keys, so components can be written
// against `theme.colors.text` and get the correct value at render time.
// Colors were lifted straight from GitHub's Primer palette (light &
// dark) to keep contrast and semantics familiar.

export type Palette = {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  danger: string;
  star: string;
  skeleton: string;
  offlineBar: string;
  offlineBarText: string;
};

export const lightPalette: Palette = {
  background: '#ffffff',
  surface: '#f6f8fa',
  border: '#d0d7de',
  text: '#1f2328',
  textMuted: '#59636e',
  accent: '#0969da',
  danger: '#cf222e',
  star: '#d29922',
  skeleton: '#eaeef2',
  offlineBar: '#fff8c5',
  offlineBarText: '#59481f',
};

export const darkPalette: Palette = {
  background: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  textMuted: '#7d8590',
  accent: '#2f81f7',
  danger: '#f85149',
  star: '#e3b341',
  skeleton: '#21262d',
  offlineBar: '#372a11',
  offlineBarText: '#e3b341',
};
