import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from './persist';

/** 'system' follows the OS; 'light'/'dark' force that appearance. */
export type ThemePreference = 'system' | 'light' | 'dark';

type SettingsState = {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (themePreference) => set({ themePreference }),
    }),
    { name: 'settings-v1', storage: zustandStorage },
  ),
);
