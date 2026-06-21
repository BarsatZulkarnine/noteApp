import { type Href, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Pill, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import type { HabitKind } from '@/lib/types';
import { useHabitsStore } from '@/store/habitsStore';

export default function NewHabit() {
  const c = useColors();
  const router = useRouter();
  const addHabit = useHabitsStore((s) => s.addHabit);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<HabitKind>('check');

  const canAdd = name.trim().length > 0;

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = addHabit({
      name: n,
      icon: kind === 'count' ? 'flame-outline' : 'checkmark-circle-outline',
      kind,
      goal: kind === 'count' ? 3 : 1,
      unit: kind === 'count' ? 'times' : undefined,
    });
    router.replace(`/habits/${id}` as Href);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
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
      <View style={[styles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          autoFocus
          placeholder="Habit name (e.g. Vitamins, Stretch)"
          placeholderTextColor={c.textSecondary}
          style={[styles.input, { color: c.text }]}
        />
      </View>
      <Text style={[styles.label, { color: c.textSecondary }]}>Type</Text>
      <View style={styles.kindRow}>
        <Pill label="Yes / No" active={kind === 'check'} onPress={() => setKind('check')} />
        <Pill label="Count" active={kind === 'count'} onPress={() => setKind('count')} />
      </View>
      <Text style={[styles.hint, { color: c.textMuted }]}>
        {kind === 'check' ? 'Tick it off once a day (e.g. Read, Stretch).' : 'Count repetitions toward a daily goal (e.g. Water, Pushups).'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  inputWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  input: { fontSize: 17, paddingVertical: Spacing.three },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  kindRow: { flexDirection: 'row', gap: Spacing.two },
  hint: { fontSize: 14, lineHeight: 20 },
});
