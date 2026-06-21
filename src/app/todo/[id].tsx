import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Checkbox, IconButton, Pill, SectionLabel, useColors } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { formatTimeOfDay, WEEKDAY_LABELS } from '@/lib/recurrence';
import type { RecurrenceKind } from '@/lib/types';
import { useTodosStore } from '@/store/todosStore';

export default function TodoEditor() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const todo = useTodosStore((s) => s.todos.find((t) => t.id === id));
  const updateTodo = useTodosStore((s) => s.updateTodo);
  const addItem = useTodosStore((s) => s.addItem);
  const toggleItem = useTodosStore((s) => s.toggleItem);
  const deleteItem = useTodosStore((s) => s.deleteItem);

  const [newItem, setNewItem] = useState('');
  const [showTime, setShowTime] = useState(false);
  const [duePicker, setDuePicker] = useState<'date' | 'time' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  if (!todo) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Text style={{ color: c.textSecondary, padding: Spacing.four }}>Todo not found.</Text>
      </View>
    );
  }

  const r = todo.recurrence;

  const setKind = (kind: RecurrenceKind) =>
    updateTodo(todo.id, {
      recurrence: {
        ...r,
        kind,
        weekday: kind === 'weekly' ? r.weekday ?? 1 : r.weekday,
        everyNDays: kind === 'interval' ? r.everyNDays ?? 2 : r.everyNDays,
      },
    });

  const onTimeChange = (_: unknown, date?: Date) => {
    setShowTime(Platform.OS === 'ios');
    if (date) updateTodo(todo.id, { recurrence: { ...r, timeOfDay: date.getHours() * 60 + date.getMinutes() } });
  };

  const onDueChange = (_: unknown, date?: Date) => {
    if (duePicker === 'date') {
      if (!date) return setDuePicker(null);
      setPendingDate(date);
      setDuePicker('time');
    } else if (duePicker === 'time') {
      setDuePicker(null);
      if (date && pendingDate) {
        const combined = new Date(pendingDate);
        combined.setHours(date.getHours(), date.getMinutes(), 0, 0);
        updateTodo(todo.id, { dueAt: combined.getTime() });
      }
      setPendingDate(null);
    }
  };

  const timeAsDate = () => {
    const d = new Date();
    d.setHours(Math.floor(r.timeOfDay / 60), r.timeOfDay % 60, 0, 0);
    return d;
  };

  const submitItem = () => {
    const text = newItem.trim();
    if (!text) return;
    addItem(todo.id, text);
    setNewItem('');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: todo.kind === 'oneoff' ? 'Task' : 'Recurring todo' }} />

      <TextInput
        value={todo.title}
        onChangeText={(t) => updateTodo(todo.id, { title: t })}
        placeholder="Title (e.g. Water the plants)"
        placeholderTextColor={c.textSecondary}
        style={[styles.title, { color: c.text }]}
      />

      {/* Kind */}
      <View style={styles.pillRow}>
        <Pill label="Recurring" active={todo.kind === 'recurring'} onPress={() => updateTodo(todo.id, { kind: 'recurring' })} />
        <Pill label="One-off" active={todo.kind === 'oneoff'} onPress={() => updateTodo(todo.id, { kind: 'oneoff' })} />
      </View>

      {todo.kind === 'recurring' ? (
        <>
          <SectionLabel>Repeats</SectionLabel>
          <View style={styles.pillRow}>
            <Pill label="Daily" active={r.kind === 'daily'} onPress={() => setKind('daily')} />
            <Pill label="Weekly" active={r.kind === 'weekly'} onPress={() => setKind('weekly')} />
            <Pill label="Every N days" active={r.kind === 'interval'} onPress={() => setKind('interval')} />
          </View>

          {r.kind === 'weekly' ? (
            <View style={styles.pillRow}>
              {WEEKDAY_LABELS.map((label, i) => (
                <Pill
                  key={label}
                  label={label}
                  active={r.weekday === i + 1}
                  onPress={() => updateTodo(todo.id, { recurrence: { ...r, weekday: i + 1 } })}
                />
              ))}
            </View>
          ) : null}

          {r.kind === 'interval' ? (
            <View style={styles.intervalRow}>
              <Text style={{ color: c.text, fontSize: 16 }}>Every</Text>
              <TextInput
                value={String(r.everyNDays ?? 2)}
                onChangeText={(t) => {
                  const n = Math.max(1, parseInt(t.replace(/[^0-9]/g, ''), 10) || 1);
                  updateTodo(todo.id, { recurrence: { ...r, everyNDays: n } });
                }}
                keyboardType="number-pad"
                style={[styles.numInput, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
              />
              <Text style={{ color: c.text, fontSize: 16 }}>days</Text>
            </View>
          ) : null}

          <SectionLabel>Time</SectionLabel>
          <Pressable onPress={() => setShowTime(true)} style={[styles.timeBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="time-outline" size={20} color={c.tint} />
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{formatTimeOfDay(r.timeOfDay)}</Text>
          </Pressable>
          {showTime ? <DateTimePicker value={timeAsDate()} mode="time" is24Hour={false} onChange={onTimeChange} /> : null}
        </>
      ) : (
        <>
          <SectionLabel>Due</SectionLabel>
          <Pressable onPress={() => setDuePicker('date')} style={[styles.timeBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="calendar-outline" size={20} color={c.tint} />
            <Text style={{ color: todo.dueAt ? c.text : c.textSecondary, fontSize: 16, fontWeight: '600' }}>
              {todo.dueAt ? format(todo.dueAt, 'EEE, MMM d • h:mm a') : 'Pick a date & time'}
            </Text>
          </Pressable>
          {duePicker ? (
            <DateTimePicker
              value={pendingDate ?? (todo.dueAt ? new Date(todo.dueAt) : new Date())}
              mode={duePicker}
              onChange={onDueChange}
            />
          ) : null}
        </>
      )}

      {/* Reminders */}
      <View style={[styles.switchRow, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>Reminders</Text>
          <Text style={{ color: c.textSecondary, fontSize: 13 }}>Send a notification when it&apos;s due</Text>
        </View>
        <Switch value={todo.remindersEnabled} onValueChange={(v) => updateTodo(todo.id, { remindersEnabled: v })} trackColor={{ true: c.tint }} />
      </View>

      {/* Checklist */}
      <SectionLabel>Checklist</SectionLabel>
      <View style={{ gap: Spacing.two }}>
        {todo.items.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <Pressable onPress={() => toggleItem(todo.id, it.id)} hitSlop={8}>
              <Checkbox checked={it.done} />
            </Pressable>
            <Text
              style={[
                styles.itemText,
                { color: it.done ? c.textSecondary : c.text, textDecorationLine: it.done ? 'line-through' : 'none' },
              ]}
            >
              {it.text}
            </Text>
            <IconButton name="close" size={18} onPress={() => deleteItem(todo.id, it.id)} />
          </View>
        ))}
        <View style={styles.itemRow}>
          <Ionicons name="add" size={22} color={c.textSecondary} />
          <TextInput
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={submitItem}
            blurOnSubmit={false}
            returnKeyType="done"
            placeholder="Add step"
            placeholderTextColor={c.textSecondary}
            style={[styles.itemText, { color: c.text }]}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  title: { fontSize: 24, fontWeight: '800' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  numInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minWidth: 64,
    textAlign: 'center',
  },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  itemText: { flex: 1, fontSize: 16, paddingVertical: Spacing.one },
});
