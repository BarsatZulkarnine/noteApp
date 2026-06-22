import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeRow } from '@/components/swipe-row';
import { toast } from '@/components/toast';
import { Card, Checkbox, EmptyState, Fab, ScreenTitle, useColors } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { dateKey } from '@/lib/date';
import { describeRecurrence } from '@/lib/recurrence';
import { currentStreak, lastNDays } from '@/lib/streak';
import type { RecurringTodo } from '@/lib/types';
import { useTodosStore } from '@/store/todosStore';

function StreakDots({ dates }: { dates: string[] }) {
  const c = useColors();
  const days = lastNDays(dates, 7);
  return (
    <View style={styles.dots}>
      {days.map((d) => (
        <View
          key={d.key}
          style={[styles.dot, { backgroundColor: d.done ? c.success : c.backgroundElement }]}
        />
      ))}
    </View>
  );
}

export default function TodosScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const todos = useTodosStore((s) => s.todos);
  const addTodo = useTodosStore((s) => s.addTodo);
  const deleteTodo = useTodosStore((s) => s.deleteTodo);
  const restoreTodo = useTodosStore((s) => s.restoreTodo);
  const markDone = useTodosStore((s) => s.markDone);
  const updateTodo = useTodosStore((s) => s.updateTodo);
  const toggleItem = useTodosStore((s) => s.toggleItem);
  const today = dateKey();

  const create = async () => {
    const id = await addTodo({
      title: '',
      kind: 'recurring',
      items: [],
      recurrence: { kind: 'daily', timeOfDay: 9 * 60 },
      remindersEnabled: true,
    });
    router.push(`/todo/${id}`);
  };

  const remove = (todo: RecurringTodo) => {
    deleteTodo(todo.id);
    toast('Todo deleted', 'Undo', () => restoreTodo(todo));
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <ScreenTitle>Todos</ScreenTitle>
      <FlatList
        data={todos}
        keyExtractor={(t) => t.id}
        contentContainerStyle={todos.length === 0 ? styles.flex : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="repeat-outline"
            title="No todos yet"
            subtitle="Tap + for a recurring routine or a one-off task with a reminder."
          />
        }
        renderItem={({ item }) => {
          const done = item.items.filter((i) => i.done).length;
          const streak = item.kind === 'recurring' ? currentStreak(item.completedDates) : 0;
          const oneoffDone = item.kind === 'oneoff' && item.completed;
          const doneToday = item.kind === 'oneoff' ? item.completed : item.completedDates.includes(today);
          const shownItems = item.items.slice(0, 4);
          return (
            <SwipeRow onDelete={() => remove(item)}>
              <Pressable
                onPress={() => router.push(`/todo/${item.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Card style={styles.card}>
                  <View style={styles.headerRow}>
                    {item.kind === 'oneoff' ? (
                      <Pressable
                        onPress={() =>
                          oneoffDone ? updateTodo(item.id, { completed: false }) : markDone(item.id)
                        }
                        hitSlop={8}
                      >
                        <Checkbox checked={!!oneoffDone} />
                      </Pressable>
                    ) : null}
                    <Text
                      style={[
                        styles.title,
                        { color: oneoffDone ? c.textMuted : c.text, textDecorationLine: oneoffDone ? 'line-through' : 'none' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title || (item.kind === 'oneoff' ? 'Untitled task' : 'Untitled routine')}
                    </Text>
                    {streak > 0 ? (
                      <View style={styles.streak}>
                        <Ionicons name="flame" size={15} color={c.warning} />
                        <Text style={{ color: c.warning, fontWeight: '700', fontSize: 13 }}>{streak}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons
                      name={item.kind === 'oneoff' ? 'calendar-outline' : 'time-outline'}
                      size={15}
                      color={c.textSecondary}
                    />
                    <Text style={[styles.meta, { color: c.textSecondary }]}>
                      {item.kind === 'oneoff'
                        ? item.dueAt
                          ? format(item.dueAt, 'EEE, MMM d • h:mm a')
                          : 'No date'
                        : describeRecurrence(item.recurrence)}
                    </Text>
                  </View>

                  {item.kind === 'recurring' ? <StreakDots dates={item.completedDates} /> : null}

                  {item.items.length > 0 ? (
                    <View style={styles.subtasks}>
                      {shownItems.map((it) => (
                        <Pressable
                          key={it.id}
                          onPress={() => toggleItem(item.id, it.id)}
                          hitSlop={6}
                          style={styles.subRow}
                        >
                          <Checkbox checked={it.done} />
                          <Text
                            style={[styles.subText, { color: it.done ? c.textMuted : c.text, textDecorationLine: it.done ? 'line-through' : 'none' }]}
                            numberOfLines={1}
                          >
                            {it.text}
                          </Text>
                        </Pressable>
                      ))}
                      {item.items.length > shownItems.length ? (
                        <Text style={[styles.meta, { color: c.textSecondary }]}>
                          +{item.items.length - shownItems.length} more · {done}/{item.items.length} done
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {doneToday ? (
                    <View style={styles.doneTag}>
                      <Ionicons name="checkmark-circle" size={16} color={c.success} />
                      <Text style={[styles.actionText, { color: c.success }]}>Done today</Text>
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => markDone(item.id)}
                        style={[styles.actionBtn, { backgroundColor: c.tint }]}
                      >
                        <Ionicons name="checkmark" size={16} color={c.onTint} />
                        <Text style={[styles.actionText, { color: c.onTint }]}>
                          {item.kind === 'oneoff' ? 'Complete' : 'Done today'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </Card>
              </Pressable>
            </SwipeRow>
          );
        }}
      />
      <Fab onPress={create} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flexGrow: 1 },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: 120 },
  card: { gap: Spacing.two },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  meta: { fontSize: 14 },
  dots: { flexDirection: 'row', gap: 4, marginTop: 2 },
  dot: { width: 16, height: 16, borderRadius: 4 },
  subtasks: { gap: Spacing.one, marginTop: Spacing.half },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  subText: { flex: 1, fontSize: 15 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 10,
  },
  doneTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.one },
  actionText: { fontSize: 13, fontWeight: '700' },
});
