// Design tokens lifted from the values the auth screens had duplicated inline.
// This exists so the seven screens added for teams/roster don't copy the same
// StyleSheet block seven more times; components/ui/ consumes it.

export const colors = {
  text: '#111',
  textMuted: '#555',
  textSubtle: '#777',
  border: '#d0d0d0',
  borderSubtle: '#e6e6e6',
  surface: '#fff',
  surfaceMuted: '#f4f4f5',
  primary: '#111',
  onPrimary: '#fff',
  danger: '#c0392b',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  md: 8,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  body: 16,
  lg: 20,
  title: 24,
  display: 28,
} as const;
