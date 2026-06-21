import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, ScreenTitle, SectionLabel, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { type ThemePreference, useSettingsStore } from '@/store/settingsStore';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <ScreenTitle>Settings</ScreenTitle>

      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel>Appearance</SectionLabel>
        <Card style={styles.segment}>
          {THEME_OPTIONS.map((opt) => {
            const active = themePreference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setThemePreference(opt.value)}
                style={({ pressed }) => [
                  styles.segmentItem,
                  { backgroundColor: active ? c.tint : 'transparent', opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name={opt.icon} size={20} color={active ? c.onTint : c.textSecondary} />
                <Text style={{ color: active ? c.onTint : c.text, fontWeight: '600', fontSize: 14 }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </Card>
        <Text style={[styles.hint, { color: c.textSecondary }]}>
          {themePreference === 'system'
            ? 'Following your device’s light/dark setting.'
            : `Always using ${themePreference} mode.`}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  segment: { flexDirection: 'row', padding: Spacing.one, gap: Spacing.one },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.sm,
  },
  hint: { fontSize: 13, marginTop: Spacing.one },
});
