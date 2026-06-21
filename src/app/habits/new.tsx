import { Ionicons } from '@expo/vector-icons';
import { type Href, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Pill, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { HabitKind } from '@/lib/types';
import { useHabitsStore } from '@/store/habitsStore';

type Preset = {
  name: string;
  icon: string;
  kind: HabitKind;
  goal: number;
  unit?: string;
};

const PRESETS: Preset[] = [
  { name: 'Water', icon: 'water-outline', kind: 'count', goal: 8, unit: 'glasses' },
  { name: 'Exercise', icon: 'fitness-outline', kind: 'check', goal: 1 },
  { name: 'Reading', icon: 'book-outline', kind: 'check', goal: 1 },
  { name: 'Meditate', icon: 'leaf-outline', kind: 'check', goal: 1 },
  { name: 'Vitamins', icon: 'medical-outline', kind: 'check', goal: 1 },
  { name: 'Walk', icon: 'walk-outline', kind: 'count', goal: 3, unit: 'walks' },
  { name: 'Pushups', icon: 'barbell-outline', kind: 'count', goal: 20, unit: 'reps' },
  { name: 'Sleep early', icon: 'moon-outline', kind: 'check', goal: 1 },
];

const ICONS = [
  'checkmark-circle-outline', 'water-outline', 'fitness-outline', 'barbell-outline',
  'book-outline', 'leaf-outline', 'medical-outline', 'walk-outline',
  'bicycle-outline', 'bed-outline', 'moon-outline', 'sunny-outline',
  'nutrition-outline', 'cafe-outline', 'heart-outline', 'flame-outline',
  'musical-notes-outline', 'brush-outline', 'language-outline', 'cash-outline',
];

export default function NewHabit() {
  const c = useColors();
  const router = useRouter();
  const addHabit = useHabitsStore((s) => s.addHabit);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<HabitKind>('check');
  const [icon, setIcon] = useState('checkmark-circle-outline');
  const [goal, setGoal] = useState(1);
  const [unit, setUnit] = useState<string | undefined>(undefined);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const canAdd = name.trim().length > 0;

  const applyPreset = (p: Preset) => {
    setName(p.name);
    setKind(p.kind);
    setIcon(p.icon);
    setGoal(p.goal);
    setUnit(p.unit);
    setActivePreset(p.name);
  };

  const setKindManual = (k: HabitKind) => {
    setKind(k);
    setActivePreset(null);
    if (k === 'check') {
      setGoal(1);
      setUnit(undefined);
    } else if (goal < 1 || unit === undefined) {
      setGoal(3);
      setUnit('times');
    }
  };

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = addHabit({ name: n, icon, kind, goal: kind === 'check' ? 1 : Math.max(1, goal), unit: kind === 'check' ? undefined : unit });
    router.replace(`/habits/${id}` as Href);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen
        options={{
          title: 'New habit',
          headerRight: () => (
            <Pressable onPress={add} disabled={!canAdd} hitSlop={8}>
              <Text style={{ color: canAdd ? c.tint : c.textMuted, fontSize: 17, fontWeight: '700' }}>Add</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: c.textSecondary }]}>Quick start</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
          {PRESETS.map((p) => {
            const active = activePreset === p.name;
            return (
              <Pressable
                key={p.name}
                onPress={() => applyPreset(p)}
                style={[styles.preset, { backgroundColor: active ? c.tint : c.card, borderColor: active ? c.tint : c.border }]}
              >
                <Ionicons name={p.icon as never} size={22} color={active ? c.onTint : c.text} />
                <Text style={[styles.presetName, { color: active ? c.onTint : c.text }]}>{p.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name={icon as never} size={22} color={c.textSecondary} />
          <TextInput
            value={name}
            onChangeText={(t) => { setName(t); setActivePreset(null); }}
            onSubmitEditing={add}
            autoFocus
            placeholder="Habit name"
            placeholderTextColor={c.textSecondary}
            style={[styles.input, { color: c.text }]}
          />
        </View>

        <Text style={[styles.label, { color: c.textSecondary }]}>Type</Text>
        <View style={styles.kindRow}>
          <Pill label="Yes / No" active={kind === 'check'} onPress={() => setKindManual('check')} />
          <Pill label="Count" active={kind === 'count'} onPress={() => setKindManual('count')} />
        </View>
        <Text style={[styles.hint, { color: c.textMuted }]}>
          {kind === 'check'
            ? 'Tick it off once a day (e.g. Read, Stretch).'
            : `Count toward a daily goal of ${Math.max(1, goal)}${unit ? ` ${unit}` : ''}. Adjust it after adding.`}
        </Text>

        <Text style={[styles.label, { color: c.textSecondary }]}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((g) => {
            const active = icon === g;
            return (
              <Pressable
                key={g}
                onPress={() => { setIcon(g); setActivePreset(null); }}
                style={[styles.iconCell, { backgroundColor: active ? c.tint : c.card, borderColor: active ? c.tint : c.border }]}
              >
                <Ionicons name={g as never} size={22} color={active ? c.onTint : c.text} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.two },
  presetRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  preset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
  },
  presetName: { fontSize: 15, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  input: { flex: 1, fontSize: 17, paddingVertical: Spacing.three },
  kindRow: { flexDirection: 'row', gap: Spacing.two },
  hint: { fontSize: 14, lineHeight: 20 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
