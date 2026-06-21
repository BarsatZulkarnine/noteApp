import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/lib/id';
import { cancelReminder, scheduleOneOff } from '@/lib/notifications';
import type { GroceryItem } from '@/lib/types';
import { zustandStorage } from './persist';

type GroceryState = {
  items: GroceryItem[];
  addItem: (name: string, category?: string) => string;
  getItem: (id: string) => GroceryItem | undefined;
  updateItem: (id: string, patch: Partial<Omit<GroceryItem, 'id' | 'createdAt'>>) => void;
  toggleLow: (id: string) => void;
  /** Set or clear an expiry date; (re)schedules the alert notification. */
  setExpiry: (id: string, expiryAt?: number) => Promise<void>;
  deleteItem: (id: string) => void;
  restoreItem: (item: GroceryItem) => void;
};

export const useGroceryStore = create<GroceryState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (name, category) => {
        const now = Date.now();
        const item: GroceryItem = {
          id: uid('g_'),
          name: name.trim(),
          category: category?.trim() || undefined,
          low: false,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ items: [item, ...s.items] }));
        return item.id;
      },

      getItem: (id) => get().items.find((it) => it.id === id),

      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id ? { ...it, ...patch, updatedAt: Date.now() } : it,
          ),
        })),

      toggleLow: (id) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id ? { ...it, low: !it.low, updatedAt: Date.now() } : it,
          ),
        })),

      setExpiry: async (id, expiryAt) => {
        const prev = get().items.find((it) => it.id === id);
        if (!prev) return;
        await cancelReminder(prev.expiryReminderId);
        let expiryReminderId: string | undefined;
        if (expiryAt) {
          expiryReminderId = await scheduleOneOff(expiryAt, `${prev.name} is expiring`, 'Use it or restock soon.');
        }
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id ? { ...it, expiryAt, expiryReminderId, updatedAt: Date.now() } : it,
          ),
        }));
      },

      deleteItem: (id) =>
        set((s) => {
          const target = s.items.find((it) => it.id === id);
          if (target?.expiryReminderId) void cancelReminder(target.expiryReminderId);
          return { items: s.items.filter((it) => it.id !== id) };
        }),

      restoreItem: (item) =>
        set((s) => (s.items.some((it) => it.id === item.id) ? s : { items: [item, ...s.items] })),
    }),
    { name: 'grocery-v1', storage: zustandStorage },
  ),
);
