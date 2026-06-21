import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, IconButton, ProgressBar, ScreenTitle, SectionLabel, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { dateKey } from '@/lib/date';
import { useGroceryStore } from '@/store/groceryStore';
import { useHabitsStore } from '@/store/habitsStore';
import { useNotesStore } from '@/store/notesStore';
import { useTodosStore } from '@/store/todosStore';

export default function TodayScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const todos = useTodosStore((s) => s.todos);
  const toggleTodoItem = useTodosStore((s) => s.toggleItem);
  const groceryItems = useGroceryStore((s) => s.items);
  const notes = useNotesStore((s) => s.notes);
  const habits = useHabitsStore((s) => s.habits);
  const increment = useHabitsStore((s) => s.increment);
  const toggleCheck = useHabitsStore((s) => s.toggleCheck);

  const lowCount = useMemo(() => groceryItems.filter((i) => i.low).length, [groceryItems]);
  const pinned = useMemo(() => notes.filter((n) => n.pinned && !n.archived), [notes]);
  const today = dateKey();
  const dueToday = todos.filter((t) => dateKey(new Date(t.nextDueAt)) === today && !(t.kind === 'oneoff' && t.completed));

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <ScreenTitle right={<IconButton name="search" onPress={() => router.push('/search')} />}>Today</ScreenTitle>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.date, { color: c.textSecondary }]}>{format(new Date(), 'EEEE, MMMM d')}</Text>

        {/* Habits */}
        <Pressable onPress={() => router.push('/habits' as Href)} style={styles.sectionHead}>
          <SectionLabel>Habits</SectionLabel>
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
        </Pressable>
        {habits.map((h) => {
          const count = h.byDate[today] ?? 0;
          const done = h.kind === 'check' ? count >= 1 : count >= h.goal;
          return (
            <Pressable key={h.id} onPress={() => router.push(`/habits/${h.id}` as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Card style={styles.habitRow}>
                <Ionicons name={h.icon as never} size={22} color={done ? c.success : c.text} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.habitName, { color: c.text }]}>{h.name}</Text>
                  {h.kind === 'count' ? (
                    <ProgressBar value={h.goal ? count / h.goal : 0} height={6} />
                  ) : (
                    <Text style={{ color: done ? c.success : c.textSecondary, fontSize: 12 }}>{done ? 'Done' : 'Not done'}</Text>
                  )}
                </View>
                {h.kind === 'count' ? <Text style={[styles.habitCount, { color: c.textSecondary }]}>{count}/{h.goal}</Text> : null}
                <Pressable
                  onPress={() => (h.kind === 'check' ? toggleCheck(h.id) : increment(h.id))}
                  style={[styles.quick, { backgroundColor: done && h.kind === 'check' ? c.success : c.tint }]}
                  hitSlop={6}
                >
                  <Ionicons name={h.kind === 'check' ? (done ? 'checkmark' : 'checkmark-outline') : 'add'} size={20} color={c.onTint} />
                </Pressable>
              </Card>
            </Pressable>
          );
        })}

        {/* Restock */}
        <Pressable onPress={() => router.push('/grocery')} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Card style={styles.statRow}>
            <View style={styles.rowCenter}>
              <Ionicons name="cart-outline" size={20} color={c.text} />
              <Text style={[styles.cardTitle, { color: c.text }]}>Restock</Text>
            </View>
            <Text style={[styles.bigStat, { color: lowCount ? c.warning : c.textSecondary }]}>{lowCount ? `${lowCount} low` : 'All good'}</Text>
          </Card>
        </Pressable>

        {/* Due today */}
        <SectionLabel>Due today</SectionLabel>
        {dueToday.length === 0 ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>Nothing scheduled. Enjoy the day.</Text>
        ) : (
          dueToday.map((t) => {
            const done = t.items.filter((i) => i.done).length;
            return (
              <Card key={t.id} style={{ gap: Spacing.two }}>
                <Pressable onPress={() => router.push(`/todo/${t.id}`)}>
                  <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>{t.title || 'Untitled'}</Text>
                </Pressable>
                {t.items.slice(0, 4).map((it) => (
                  <Pressable key={it.id} onPress={() => toggleTodoItem(t.id, it.id)} style={styles.checkItem}>
                    <Ionicons name={it.done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={it.done ? c.success : c.textMuted} />
                    <Text style={{ color: it.done ? c.textMuted : c.text, textDecorationLine: it.done ? 'line-through' : 'none', flex: 1 }} numberOfLines={1}>{it.text}</Text>
                  </Pressable>
                ))}
                {t.items.length > 0 ? <Text style={[styles.cardMeta, { color: c.textSecondary }]}>{done}/{t.items.length} done</Text> : null}
              </Card>
            );
          })
        )}

        {/* Pinned notes */}
        {pinned.length > 0 ? (
          <>
            <SectionLabel>Pinned</SectionLabel>
            {pinned.map((n) => (
              <Pressable key={n.id} onPress={() => router.push(`/note/${n.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Card style={styles.rowCenter}>
                  <Ionicons name="bookmark" size={18} color={c.tint} />
                  <Text style={[styles.cardTitle, { color: c.text, flex: 1 }]} numberOfLines={1}>{n.title || 'Untitled'}</Text>
                </Card>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: 120 },
  date: { fontSize: 15, marginTop: -Spacing.two, marginBottom: Spacing.one },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardMeta: { fontSize: 14 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigStat: { fontSize: 18, fontWeight: '800' },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  habitName: { fontSize: 16, fontWeight: '600' },
  habitCount: { fontSize: 13, fontWeight: '600' },
  quick: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  muted: { fontSize: 14 },
});
