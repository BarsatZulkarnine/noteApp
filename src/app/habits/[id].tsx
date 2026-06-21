import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, IconButton, ProgressBar, SectionLabel, useColors, WeekBars } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { dateKey } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { currentStreak } from '@/lib/streak';
import { useHabitsStore } from '@/store/habitsStore';

function Stepper({ label, value, suffix, onDec, onInc }: { label: string; value: string | number; suffix?: string; onDec: () => void; onInc: () => void }) {
  const c = useColors();
  return (
    <View style={styles.stepperRow}>
      <Text style={{ color: c.text, fontSize: 16, flex: 1 }}>{label}</Text>
      <IconButton name="remove-circle-outline" size={26} color={c.text} onPress={onDec} />
      <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', minWidth: 64, textAlign: 'center' }}>
        {value}{suffix ?? ''}
      </Text>
      <IconButton name="add-circle-outline" size={26} color={c.text} onPress={onInc} />
    </View>
  );
}

export default function HabitDetail() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabitsStore((s) => s.habits.find((h) => h.id === id));
  const increment = useHabitsStore((s) => s.increment);
  const decrement = useHabitsStore((s) => s.decrement);
  const toggleCheck = useHabitsStore((s) => s.toggleCheck);
  const updateHabit = useHabitsStore((s) => s.updateHabit);
  const setReminders = useHabitsStore((s) => s.setReminders);
  const deleteHabit = useHabitsStore((s) => s.deleteHabit);

  if (!habit) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Text style={{ color: c.textSecondary, padding: Spacing.four }}>Habit not found.</Text>
      </View>
    );
  }

  const count = habit.byDate[dateKey()] ?? 0;
  const isCheck = habit.kind === 'check';

  const onInc = () => { increment(habit.id); if (count + 1 >= habit.goal) haptics.success(); else haptics.light(); };
  const onDec = () => { decrement(habit.id); haptics.light(); };
  const onToggle = () => { toggleCheck(habit.id); if (count >= 1) haptics.light(); else haptics.success(); };
  const metDates = Object.entries(habit.byDate).filter(([, v]) => v >= habit.goal).map(([k]) => k);
  const streak = currentStreak(metDates);

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const key = dateKey(day);
    return { label: format(day, 'EEEEE'), value: habit.byDate[key] ?? 0, today: i === 6 };
  });

  const onDelete = async () => {
    await deleteHabit(habit.id);
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: habit.name,
          headerRight: () => (habit.id === 'water' ? null : <IconButton name="trash-outline" color={c.danger} onPress={onDelete} />),
        }}
      />

      <Card style={{ gap: Spacing.three, alignItems: 'center' }}>
        <Ionicons name={habit.icon as never} size={32} color={c.text} />
        {isCheck ? (
          <Text style={[styles.big, { color: count >= 1 ? c.success : c.text }]}>{count >= 1 ? 'Done' : '—'}</Text>
        ) : (
          <Text style={[styles.big, { color: c.text }]}>{count}</Text>
        )}
        <Text style={{ color: c.textSecondary }}>
          {isCheck ? (count >= 1 ? 'Completed today' : 'Not done yet') : `of ${habit.goal} ${habit.unit ?? ''}`}
        </Text>
        {!isCheck ? <ProgressBar value={habit.goal ? count / habit.goal : 0} height={12} /> : null}
        <View style={styles.btnRow}>
          {isCheck ? (
            <View style={[styles.bigAdd, { backgroundColor: count >= 1 ? c.success : c.tint }]}>
              <IconButton name={count >= 1 ? 'checkmark-done' : 'checkmark'} size={28} color={c.onTint} onPress={onToggle} />
            </View>
          ) : (
            <>
              <View style={[styles.stepBtn, { borderColor: c.border }]}>
                <IconButton name="remove" size={26} color={c.text} onPress={onDec} />
              </View>
              <View style={[styles.bigAdd, { backgroundColor: c.tint }]}>
                <IconButton name="add" size={28} color={c.onTint} onPress={onInc} />
              </View>
            </>
          )}
        </View>
      </Card>

      <SectionLabel>This week{streak > 0 ? `  ·  🔥 ${streak} day streak` : ''}</SectionLabel>
      <Card>
        <WeekBars data={week} goal={habit.goal} />
      </Card>

      {!isCheck ? (
        <>
          <SectionLabel>Goal</SectionLabel>
          <Card>
            <Stepper label="Daily goal" value={habit.goal} suffix={` ${habit.unit ?? ''}`} onDec={() => updateHabit(habit.id, { goal: Math.max(1, habit.goal - 1) })} onInc={() => updateHabit(habit.id, { goal: habit.goal + 1 })} />
          </Card>
        </>
      ) : null}

      <SectionLabel>Reminders</SectionLabel>
      <Card style={{ gap: Spacing.three }}>
        <View style={styles.switchRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 }}>
            <Ionicons name="notifications-outline" size={18} color={c.text} />
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>Remind me</Text>
          </View>
          <Switch value={habit.reminders.enabled} onValueChange={(v) => setReminders(habit.id, { enabled: v })} trackColor={{ true: c.tint }} />
        </View>
        {habit.reminders.enabled ? (
          <>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Stepper label="Every" value={habit.reminders.everyHours} suffix=" h" onDec={() => setReminders(habit.id, { everyHours: Math.max(1, habit.reminders.everyHours - 1) })} onInc={() => setReminders(habit.id, { everyHours: habit.reminders.everyHours + 1 })} />
            <Stepper label="From" value={habit.reminders.startHour} suffix=":00" onDec={() => setReminders(habit.id, { startHour: Math.max(0, habit.reminders.startHour - 1) })} onInc={() => setReminders(habit.id, { startHour: Math.min(habit.reminders.endHour - 1, habit.reminders.startHour + 1) })} />
            <Stepper label="Until" value={habit.reminders.endHour} suffix=":00" onDec={() => setReminders(habit.id, { endHour: Math.max(habit.reminders.startHour + 1, habit.reminders.endHour - 1) })} onInc={() => setReminders(habit.id, { endHour: Math.min(23, habit.reminders.endHour + 1) })} />
          </>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  big: { fontSize: 56, fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: Spacing.three, width: '100%' },
  stepBtn: { width: 64, height: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  bigAdd: { flex: 1, height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.one },
});
