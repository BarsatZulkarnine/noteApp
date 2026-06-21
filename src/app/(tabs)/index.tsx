import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pop } from '@/components/pop';
import { SwipeRow } from '@/components/swipe-row';
import { toast } from '@/components/toast';
import { Card, IconButton, ProgressBar, ScreenTitle, SectionLabel, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { dateKey } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { buildReminders, type ReminderTone } from '@/lib/reminders';
import { currentStreak, lastNDays } from '@/lib/streak';
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
  const deleteHabit = useHabitsStore((s) => s.deleteHabit);
  const restoreHabit = useHabitsStore((s) => s.restoreHabit);

  const [remindersOpen, setRemindersOpen] = useState(false);

  const lowCount = useMemo(() => groceryItems.filter((i) => i.low).length, [groceryItems]);
  const pinned = useMemo(() => notes.filter((n) => n.pinned && !n.archived), [notes]);
  const today = dateKey();
  const dueToday = todos.filter((t) => dateKey(new Date(t.nextDueAt)) === today && !(t.kind === 'oneoff' && t.completed));
  const reminders = useMemo(
    () => buildReminders({ todos, grocery: groceryItems, habits }, Date.now()),
    [todos, groceryItems, habits],
  );
  const toneColor = (tone: ReminderTone) => (tone === 'danger' ? c.danger : tone === 'warning' ? c.warning : c.textSecondary);

  const toggleReminders = () => {
    haptics.select();
    setRemindersOpen((v) => !v);
  };

  const removeHabit = (h: (typeof habits)[number]) => {
    deleteHabit(h.id);
    haptics.light();
    toast('Habit deleted', 'Undo', () => restoreHabit(h));
  };

  const onQuickHabit = (h: (typeof habits)[number]) => {
    const cur = h.byDate[today] ?? 0;
    if (h.kind === 'check') {
      toggleCheck(h.id);
      if (cur >= 1) haptics.light();
      else haptics.success();
    } else {
      increment(h.id);
      if (cur + 1 >= h.goal) haptics.success();
      else haptics.light();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <ScreenTitle right={<IconButton name="search" onPress={() => router.push('/search')} />}>Today</ScreenTitle>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.date, { color: c.textSecondary }]}>{format(new Date(), 'EEEE, MMMM d')}</Text>

        {/* Reminders */}
        {reminders.length > 0 ? (
          <Animated.View layout={LinearTransition.duration(200)} style={[styles.remCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Pressable onPress={toggleReminders} style={styles.remHead} hitSlop={6}>
              <Ionicons name="notifications-outline" size={18} color={c.text} />
              <Text style={[styles.remTitle, { color: c.text }]}>Reminders</Text>
              <View style={[styles.remBadge, { backgroundColor: c.tint }]}>
                <Text style={[styles.remBadgeText, { color: c.onTint }]}>{reminders.length}</Text>
              </View>
              <View style={{ flex: 1 }} />
              <Ionicons name={remindersOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
            </Pressable>
            {remindersOpen
              ? reminders.map((r, i) => (
                  <Animated.View key={r.id} entering={FadeInUp.duration(160).delay(i * 28)}>
                    <Pressable onPress={() => router.push(r.href as Href)} style={({ pressed }) => [styles.remRow, { opacity: pressed ? 0.6 : 1 }]}>
                      <Ionicons name={r.icon as never} size={18} color={toneColor(r.tone)} />
                      <Text style={[styles.remText, { color: c.text }]} numberOfLines={1}>{r.text}</Text>
                      <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
                    </Pressable>
                  </Animated.View>
                ))
              : (
                <Text style={[styles.remPreview, { color: c.textSecondary }]} numberOfLines={1}>
                  {reminders[0].text}{reminders.length > 1 ? ` · +${reminders.length - 1} more` : ''}
                </Text>
              )}
          </Animated.View>
        ) : null}

        {/* Habits */}
        <View style={styles.sectionHead}>
          <SectionLabel>Habits</SectionLabel>
          <Pressable onPress={() => router.push('/habits/new' as Href)} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="add-circle-outline" size={22} color={c.tint} />
          </Pressable>
        </View>
        {habits.map((h) => {
          const count = h.byDate[today] ?? 0;
          const done = h.kind === 'check' ? count >= 1 : count >= h.goal;
          const metDates = Object.entries(h.byDate).filter(([, v]) => v >= h.goal).map(([k]) => k);
          const streak = currentStreak(metDates);
          const week = lastNDays(metDates, 7);
          return (
            <SwipeRow key={h.id} onDelete={() => removeHabit(h)}>
              <Pressable onPress={() => router.push(`/habits/${h.id}` as Href)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Card style={styles.habitRow}>
                <Ionicons name={h.icon as never} size={22} color={done ? c.success : c.text} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={[styles.habitName, { color: c.text }]}>{h.name}</Text>
                  {h.kind === 'count' ? (
                    <ProgressBar value={h.goal ? count / h.goal : 0} height={6} />
                  ) : (
                    <Text style={{ color: done ? c.success : c.textSecondary, fontSize: 12 }}>{done ? 'Done' : 'Not done'}</Text>
                  )}
                  <View style={styles.dotsRow}>
                    {week.map((d) => (
                      <View
                        key={d.key}
                        style={[styles.dot, { backgroundColor: d.done ? c.success : 'transparent', borderColor: d.done ? c.success : c.border }]}
                      />
                    ))}
                    {streak > 0 ? <Text style={[styles.streak, { color: c.textSecondary }]}>🔥 {streak}</Text> : null}
                  </View>
                </View>
                {h.kind === 'count' ? <Text style={[styles.habitCount, { color: c.textSecondary }]}>{count}/{h.goal}</Text> : null}
                <Pop
                  onPress={() => onQuickHabit(h)}
                  style={[styles.quick, { backgroundColor: done && h.kind === 'check' ? c.success : c.tint }]}
                  hitSlop={6}
                >
                  <Ionicons name={h.kind === 'check' ? (done ? 'checkmark' : 'checkmark-outline') : 'add'} size={20} color={c.onTint} />
                </Pop>
              </Card>
              </Pressable>
            </SwipeRow>
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
  remCard: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two, overflow: 'hidden' },
  remHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  remTitle: { fontSize: 15, fontWeight: '700' },
  remBadge: { minWidth: 20, height: 20, borderRadius: Radius.full, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  remBadgeText: { fontSize: 12, fontWeight: '800' },
  remPreview: { fontSize: 14 },
  remRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  remText: { flex: 1, fontSize: 15 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  dot: { width: 9, height: 9, borderRadius: Radius.full, borderWidth: StyleSheet.hairlineWidth },
  streak: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  quick: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  muted: { fontSize: 14 },
});
