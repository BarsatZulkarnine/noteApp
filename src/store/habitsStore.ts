import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dateKey } from '@/lib/date';
import { applyDecrement, applyIncrement, applyToggle } from '@/lib/habit-mutations';
import { uid } from '@/lib/id';
import { cancelReminders, scheduleIntervalReminders } from '@/lib/notifications';
import type { Habit, HabitKind, HabitReminders } from '@/lib/types';
import { zustandStorage } from './persist';

function defaultWater(): Habit {
  return {
    id: 'water',
    name: 'Water',
    icon: 'water-outline',
    kind: 'count',
    goal: 8,
    unit: 'glasses',
    byDate: {},
    reminders: { enabled: false, everyHours: 2, startHour: 8, endHour: 22 },
    notificationIds: [],
    createdAt: Date.now(),
  };
}

type NewHabit = { name: string; icon: string; kind: HabitKind; goal: number; unit?: string };

type HabitsState = {
  habits: Habit[];
  getHabit: (id: string) => Habit | undefined;
  countToday: (id: string) => number;
  addHabit: (input: NewHabit) => string;
  updateHabit: (id: string, patch: Partial<Pick<Habit, 'name' | 'icon' | 'goal' | 'unit' | 'kind'>>) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  /** Toggle a 'check' habit done/undone for today. */
  toggleCheck: (id: string) => void;
  deleteHabit: (id: string) => Promise<void>;
  /** Re-insert a deleted habit (for Undo), re-arming reminders if they were on. */
  restoreHabit: (habit: Habit) => Promise<void>;
  setReminders: (id: string, patch: Partial<HabitReminders>) => Promise<void>;
  /** Re-arm reminder notifications on app start. */
  syncReminders: () => Promise<void>;
};

export const useHabitsStore = create<HabitsState>()(
  persist(
    (set, get) => ({
      habits: [defaultWater()],

      getHabit: (id) => get().habits.find((h) => h.id === id),
      countToday: (id) => get().habits.find((h) => h.id === id)?.byDate[dateKey()] ?? 0,

      addHabit: (input) => {
        const habit: Habit = {
          id: uid('habit_'),
          name: input.name.trim() || 'Habit',
          icon: input.icon,
          kind: input.kind,
          goal: input.kind === 'check' ? 1 : Math.max(1, input.goal),
          unit: input.unit,
          byDate: {},
          reminders: { enabled: false, everyHours: 3, startHour: 9, endHour: 21 },
          notificationIds: [],
          createdAt: Date.now(),
        };
        set((s) => ({ habits: [...s.habits, habit] }));
        return habit.id;
      },

      updateHabit: (id, patch) =>
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),

      increment: (id) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? applyIncrement(h, dateKey()) : h)),
        })),

      decrement: (id) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? applyDecrement(h, dateKey()) : h)),
        })),

      toggleCheck: (id) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? applyToggle(h, dateKey()) : h)),
        })),

      deleteHabit: async (id) => {
        const prev = get().habits.find((h) => h.id === id);
        if (prev) await cancelReminders(prev.notificationIds);
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
      },

      restoreHabit: async (habit) => {
        if (get().habits.some((h) => h.id === habit.id)) return;
        let restored = { ...habit, notificationIds: [] as string[] };
        if (habit.reminders.enabled) {
          restored.notificationIds = await scheduleIntervalReminders(
            habit.reminders,
            `${habit.name} reminder`,
            habit.kind === 'count' ? `Log your ${habit.name.toLowerCase()}.` : `Time for ${habit.name.toLowerCase()}.`,
          );
        }
        set((s) => ({ habits: [...s.habits, restored] }));
      },

      setReminders: async (id, patch) => {
        const prev = get().habits.find((h) => h.id === id);
        if (!prev) return;
        const reminders = { ...prev.reminders, ...patch };
        await cancelReminders(prev.notificationIds);
        const notificationIds = await scheduleIntervalReminders(
          reminders,
          `${prev.name} reminder`,
          prev.kind === 'count' ? `Log your ${prev.name.toLowerCase()}.` : `Time for ${prev.name.toLowerCase()}.`,
        );
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, reminders, notificationIds } : h)) }));
      },

      syncReminders: async () => {
        for (const h of get().habits) {
          if (h.reminders.enabled && h.notificationIds.length === 0) {
            const ids = await scheduleIntervalReminders(
              h.reminders,
              `${h.name} reminder`,
              h.kind === 'count' ? `Log your ${h.name.toLowerCase()}.` : `Time for ${h.name.toLowerCase()}.`,
            );
            set((s) => ({ habits: s.habits.map((x) => (x.id === h.id ? { ...x, notificationIds: ids } : x)) }));
          }
        }
      },
    }),
    { name: 'habits-v1', storage: zustandStorage },
  ),
);
