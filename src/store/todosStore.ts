import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dateKey } from '@/lib/date';
import { uid } from '@/lib/id';
import { cancelReminder, scheduleOneOff, scheduleRecurring } from '@/lib/notifications';
import { computeNextDue } from '@/lib/recurrence';
import type { ChecklistItem, Recurrence, RecurringTodo, TodoKind } from '@/lib/types';
import { zustandStorage } from './persist';

type NewTodo = {
  title: string;
  kind: TodoKind;
  items: ChecklistItem[];
  recurrence: Recurrence;
  dueAt?: number;
  remindersEnabled: boolean;
};

type TodoPatch = Partial<
  Pick<RecurringTodo, 'title' | 'items' | 'recurrence' | 'remindersEnabled' | 'kind' | 'dueAt' | 'completed'>
>;

type TodosState = {
  todos: RecurringTodo[];
  getTodo: (id: string) => RecurringTodo | undefined;
  addTodo: (input: NewTodo) => Promise<string>;
  updateTodo: (id: string, patch: TodoPatch) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  restoreTodo: (todo: RecurringTodo) => Promise<void>;
  toggleItem: (id: string, itemId: string) => void;
  addItem: (id: string, text: string) => void;
  deleteItem: (id: string, itemId: string) => void;
  resetTodo: (id: string) => void;
  /** Mark done for today: records a streak day, marks steps complete, advances to next occurrence. */
  markDone: (id: string) => Promise<void>;
  /** Reset overdue recurring todos and re-arm reminders. Call on app start. */
  reconcile: () => Promise<void>;
};

function replace(todos: RecurringTodo[], id: string, fn: (t: RecurringTodo) => RecurringTodo) {
  return todos.map((t) => (t.id === id ? fn(t) : t));
}

/** Schedule the OS reminder appropriate to the todo's kind. */
async function scheduleFor(todo: RecurringTodo): Promise<string | undefined> {
  if (!todo.remindersEnabled) return undefined;
  if (todo.kind === 'oneoff') {
    if (!todo.dueAt) return undefined;
    return scheduleOneOff(todo.dueAt, todo.title || 'Reminder', 'Don’t forget this.');
  }
  return scheduleRecurring(todo);
}

export const useTodosStore = create<TodosState>()(
  persist(
    (set, get) => ({
      todos: [],

      getTodo: (id) => get().todos.find((t) => t.id === id),

      addTodo: async (input) => {
        const now = Date.now();
        const nextDueAt =
          input.kind === 'oneoff'
            ? input.dueAt ?? now
            : computeNextDue(input.recurrence).getTime();
        const todo: RecurringTodo = {
          id: uid('todo_'),
          title: input.title,
          kind: input.kind,
          items: input.items,
          recurrence: input.recurrence,
          dueAt: input.dueAt,
          completed: false,
          completedDates: [],
          remindersEnabled: input.remindersEnabled,
          nextDueAt,
          lastResetAt: now,
          createdAt: now,
          updatedAt: now,
        };
        const notificationId = await scheduleFor(todo);
        set((s) => ({ todos: [{ ...todo, notificationId }, ...s.todos] }));
        return todo.id;
      },

      updateTodo: async (id, patch) => {
        const prev = get().todos.find((t) => t.id === id);
        if (!prev) return;
        const next: RecurringTodo = { ...prev, ...patch, updatedAt: Date.now() };
        next.nextDueAt =
          next.kind === 'oneoff'
            ? next.dueAt ?? next.nextDueAt
            : patch.recurrence
              ? computeNextDue(next.recurrence).getTime()
              : prev.nextDueAt;

        const needsReschedule =
          patch.recurrence !== undefined ||
          patch.remindersEnabled !== undefined ||
          patch.kind !== undefined ||
          patch.dueAt !== undefined;
        if (!needsReschedule) {
          set((s) => ({ todos: replace(s.todos, id, () => next) }));
          return;
        }
        await cancelReminder(prev.notificationId);
        const notificationId = await scheduleFor(next);
        set((s) => ({ todos: replace(s.todos, id, () => ({ ...next, notificationId })) }));
      },

      deleteTodo: async (id) => {
        const prev = get().todos.find((t) => t.id === id);
        await cancelReminder(prev?.notificationId);
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
      },

      restoreTodo: async (todo) => {
        if (get().todos.some((t) => t.id === todo.id)) return;
        const notificationId = await scheduleFor(todo);
        set((s) => ({ todos: [{ ...todo, notificationId }, ...s.todos] }));
      },

      toggleItem: (id, itemId) => {
        set((s) => ({
          todos: replace(s.todos, id, (t) => ({
            ...t,
            items: t.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
            updatedAt: Date.now(),
          })),
        }));
        // Checking off the last sub-task completes the todo for today.
        const t = get().todos.find((x) => x.id === id);
        if (!t || t.items.length === 0 || !t.items.every((it) => it.done)) return;
        const alreadyDone = t.kind === 'oneoff' ? t.completed : t.completedDates.includes(dateKey());
        if (!alreadyDone) void get().markDone(id);
      },

      addItem: (id, text) =>
        set((s) => ({
          todos: replace(s.todos, id, (t) => ({
            ...t,
            items: [...t.items, { id: uid('it_'), text, done: false }],
            updatedAt: Date.now(),
          })),
        })),

      deleteItem: (id, itemId) =>
        set((s) => ({
          todos: replace(s.todos, id, (t) => ({
            ...t,
            items: t.items.filter((it) => it.id !== itemId),
            updatedAt: Date.now(),
          })),
        })),

      resetTodo: (id) =>
        set((s) => ({
          todos: replace(s.todos, id, (t) => ({
            ...t,
            items: t.items.map((it) => ({ ...it, done: false })),
            lastResetAt: Date.now(),
            nextDueAt: computeNextDue(t.recurrence).getTime(),
            updatedAt: Date.now(),
          })),
        })),

      markDone: async (id) => {
        const prev = get().todos.find((t) => t.id === id);
        if (!prev) return;
        const today = dateKey();
        if (prev.kind === 'oneoff') {
          await cancelReminder(prev.notificationId);
          set((s) => ({
            todos: replace(s.todos, id, (t) => ({
              ...t,
              completed: true,
              completedDates: t.completedDates.includes(today)
                ? t.completedDates
                : [...t.completedDates, today],
              notificationId: undefined,
              updatedAt: Date.now(),
            })),
          }));
          return;
        }
        if (prev.completedDates.includes(today)) return; // already done today — don't double-advance
        set((s) => ({
          todos: replace(s.todos, id, (t) => ({
            ...t,
            completedDates: [...t.completedDates, today],
            // Mark every step done so the completed checklist stays visible; the
            // fresh reset happens at the next occurrence via reconcile().
            items: t.items.map((it) => ({ ...it, done: true })),
            lastResetAt: Date.now(),
            nextDueAt: computeNextDue(t.recurrence).getTime(),
            updatedAt: Date.now(),
          })),
        }));
      },

      reconcile: async () => {
        const now = Date.now();
        set((s) => ({
          todos: s.todos.map((t) => {
            if (t.kind !== 'recurring' || t.nextDueAt > now) return t;
            return {
              ...t,
              items: t.items.map((it) => ({ ...it, done: false })),
              lastResetAt: now,
              nextDueAt: computeNextDue(t.recurrence, new Date(now)).getTime(),
            };
          }),
        }));

        for (const t of get().todos) {
          if (t.remindersEnabled && !t.notificationId && !(t.kind === 'oneoff' && t.completed)) {
            const notificationId = await scheduleFor(t);
            if (notificationId) {
              set((s) => ({ todos: replace(s.todos, t.id, (x) => ({ ...x, notificationId })) }));
            }
          }
        }
      },
    }),
    {
      name: 'todos-v1',
      storage: zustandStorage,
      version: 1,
      migrate: (persisted: unknown) => {
        const state = persisted as TodosState;
        return {
          ...state,
          todos: (state.todos ?? []).map((t) => ({
            ...t,
            kind: t.kind ?? 'recurring',
            completedDates: t.completedDates ?? [],
          })),
        };
      },
    },
  ),
);
