/**
 * Resolves the effective light/dark scheme by combining the user's saved theme
 * preference (settings) with the OS scheme. Use this anywhere a concrete
 * 'light' | 'dark' is needed instead of the raw system value.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settingsStore';

export function useResolvedScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const pref = useSettingsStore((s) => s.themePreference);
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}
