/**
 * Monochrome "ink & paper" palette. The accent (`tint`) is ink itself —
 * near-black in light mode, near-white in dark mode. Status colors are kept muted.
 * `onTint` is the color to draw on top of a `tint`-filled surface (button labels, FAB icon).
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0A0A0A',
    textSecondary: '#71717A',
    textMuted: '#A1A1AA',
    background: '#FBFBFA',
    card: '#FFFFFF',
    backgroundElement: '#F3F3F1',
    backgroundSelected: '#E8E8E5',
    border: '#E6E6E3',
    tint: '#111111',
    tintSoft: '#ECECEA',
    onTint: '#FFFFFF',
    danger: '#B42318',
    warning: '#B45309',
    success: '#15803D',
  },
  dark: {
    text: '#F5F5F4',
    textSecondary: '#A1A1AA',
    textMuted: '#6B6B70',
    background: '#0A0A0A',
    card: '#161616',
    backgroundElement: '#1E1E1E',
    backgroundSelected: '#2A2A2A',
    border: '#262626',
    tint: '#FAFAF9',
    tintSoft: '#1F1F1F',
    onTint: '#0A0A0A',
    danger: '#F97066',
    warning: '#FDB022',
    success: '#4ADE80',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

/** Muted color labels for notes — the one place we allow color in the monochrome UI. */
export const LABEL_COLORS = {
  red: '#D4604F',
  amber: '#C98A2B',
  green: '#4F9D69',
  blue: '#4F86C9',
  purple: '#8A6BC9',
} as const;

export type LabelColorKey = keyof typeof LABEL_COLORS;
