import { Ionicons } from '@expo/vector-icons';
import { type Href, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, Pill, ProgressBar, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { dateKey } from '@/lib/date';
import type { HabitKind } from '@/lib/types';
import { useHabitsStore } from '@/store/habitsStore';

export default function HabitsScreen() {
  const c = useColors();
  const router = useRouter();
  const habits = useHabitsStore((s) => s.habits);
  const addHabit = useHabitsStore((s) => s.addHabit);
  const increment = useHabitsStore((s) => s.increment);
  const toggleCheck = useHabitsStore((s) => s.toggleCheck);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<HabitKind>('check');

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const id = addHabit({ name: n, icon: kind === 'count' ? 'flame-outline' : 'checkmark-circle-outline', kind, goal: kind === 'count' ? 3 : 1, unit: kind === 'count' ? 'times' : undefined });
    setName('');
    router.push(`/habits/${id}` as Href);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: 'Habits' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.addRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="add" size={22} color={c.textSecondary} />
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={add}
            blurOnSubmit={false}
            placeholder="New habit (e.g. Vitamins, Stretch)"
            placeholderTextColor={c.textSecondary}
            style={[styles.addInput, { color: c.text }]}
          />
        </View>
        <View style={styles.kindRow}>
          <Pill label="Yes/No" active={kind === 'check'} onPress={() => setKind('check')} />
          <Pill label="Count" active={kind === 'count'} onPress={() => setKind('count')} />
        </View>

        {habits.map((h) => {
          const count = h.byDate[dateKey()] ?? 0;
          const done = h.kind === 'check' ? count >= 1 : count >= h.goal;
          return (
            <Pressable key={h.id} onPress={() => router.push(`/habits/${h.id}` as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Card style={styles.habitRow}>
                <Ionicons name={h.icon as never} size={24} color={done ? c.success : c.text} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.name, { color: c.text }]}>{h.name}</Text>
                  {h.kind === 'count' ? (
                    <>
                      <Text style={[styles.meta, { color: c.textSecondary }]}>{count} / {h.goal} {h.unit}</Text>
                      <ProgressBar value={h.goal ? count / h.goal : 0} height={6} />
                    </>
                  ) : (
                    <Text style={[styles.meta, { color: done ? c.success : c.textSecondary }]}>{done ? 'Done today' : 'Not done'}</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => (h.kind === 'check' ? toggleCheck(h.id) : increment(h.id))}
                  style={[styles.quick, { backgroundColor: done && h.kind === 'check' ? c.success : c.tint }]}
                  hitSlop={6}
                >
                  <Ionicons name={h.kind === 'check' ? (done ? 'checkmark' : 'checkmark-outline') : 'add'} size={22} color={c.onTint} />
                </Pressable>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.three },
  kindRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13 },
  quick: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
});
