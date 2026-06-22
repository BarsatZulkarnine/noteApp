import { format } from 'date-fns';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/lib/id';
import { cancelReminder, scheduleOneOff } from '@/lib/notifications';
import { buyByAt, justRestocked, predictRunOutAt } from '@/lib/prediction';
import type { GroceryItem, PantryEventKind } from '@/lib/types';
import { zustandStorage } from './persist';

type EstimatePatch = { unit?: string; initialRatePerDay?: number; leadTimeDays?: number };

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

  // --- Predictive restock ---
  /** Log a pantry event (purchase / ran-out / low / remaining), then re-predict. */
  recordEvent: (id: string, kind: PantryEventKind, qty?: number) => Promise<void>;
  /** Attach a barcode to an item (deduped). */
  addBarcode: (id: string, code: string) => void;
  /** Find the item a barcode resolves to, if any. */
  resolveBarcode: (code: string) => GroceryItem | undefined;
  /** Fuse `sourceId` into `targetId`: merge events + barcodes, delete source. Keeps the target's unit. */
  mergeItems: (sourceId: string, targetId: string) => Promise<{ ok: boolean; reason?: string }>;
  /** Set the unit / seed rate / lead time, then re-predict. */
  setEstimate: (id: string, patch: EstimatePatch) => Promise<void>;
  /** Recompute every item's prediction and (re)arm restock notifications. Call on launch. */
  reconcilePredictions: () => Promise<void>;
};

export const useGroceryStore = create<GroceryState>()(
  persist(
    (set, get) => {
      /** Recompute one item's prediction, auto-flag low if overdue, and (re)schedule its alert. */
      const reschedule = async (id: string) => {
        const it = get().items.find((x) => x.id === id);
        if (!it) return;
        await cancelReminder(it.restockNotificationId);

        const now = Date.now();
        const runOut = predictRunOutAt(it, now);
        let restockNotificationId: string | undefined;
        let low = it.low;

        if (runOut != null && !justRestocked(it, now)) {
          const buyBy = buyByAt(runOut, it.leadTimeDays);
          if (now >= buyBy) {
            low = true; // already due — surface it on the shopping list now
          } else {
            restockNotificationId = await scheduleOneOff(
              buyBy,
              `${it.name} running low`,
              `Likely out around ${format(runOut, 'MMM d')} — add it to your list.`,
            );
          }
        }

        set((s) => ({
          items: s.items.map((x) =>
            x.id === id
              ? { ...x, predictedRunOutAt: runOut, restockNotificationId, low, updatedAt: Date.now() }
              : x,
          ),
        }));
      };

      return {
        items: [],

        addItem: (name, category) => {
          const now = Date.now();
          const item: GroceryItem = {
            id: uid('g_'),
            name: name.trim(),
            category: category?.trim() || undefined,
            low: false,
            barcodes: [],
            events: [],
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
            if (target?.restockNotificationId) void cancelReminder(target.restockNotificationId);
            return { items: s.items.filter((it) => it.id !== id) };
          }),

        restoreItem: (item) =>
          set((s) => (s.items.some((it) => it.id === item.id) ? s : { items: [item, ...s.items] })),

        recordEvent: async (id, kind, qty) => {
          set((s) => ({
            items: s.items.map((it) =>
              it.id === id
                ? {
                    ...it,
                    events: [...(it.events ?? []), { id: uid('ev_'), kind, at: Date.now(), qty }],
                    // A purchase clears the low flag; an explicit low/ran-out raises it.
                    low: kind === 'purchase' ? false : kind === 'low' || kind === 'ranout' ? true : it.low,
                    updatedAt: Date.now(),
                  }
                : it,
            ),
          }));
          await reschedule(id);
        },

        addBarcode: (id, code) =>
          set((s) => ({
            items: s.items.map((it) =>
              it.id === id && !(it.barcodes ?? []).includes(code)
                ? { ...it, barcodes: [...(it.barcodes ?? []), code], updatedAt: Date.now() }
                : it,
            ),
          })),

        resolveBarcode: (code) => get().items.find((it) => (it.barcodes ?? []).includes(code)),

        mergeItems: async (sourceId, targetId) => {
          const src = get().items.find((it) => it.id === sourceId);
          const tgt = get().items.find((it) => it.id === targetId);
          if (!src || !tgt || src.id === tgt.id) return { ok: false, reason: 'Item not found.' };
          await cancelReminder(src.restockNotificationId);
          set((s) => ({
            items: s.items
              .map((it) =>
                it.id === targetId
                  ? {
                      ...it,
                      events: [...(it.events ?? []), ...(src.events ?? [])].sort((a, b) => a.at - b.at),
                      barcodes: Array.from(new Set([...(it.barcodes ?? []), ...(src.barcodes ?? [])])),
                      updatedAt: Date.now(),
                    }
                  : it,
              )
              .filter((it) => it.id !== sourceId),
          }));
          await reschedule(targetId);
          return { ok: true };
        },

        setEstimate: async (id, patch) => {
          set((s) => ({
            items: s.items.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: Date.now() } : it)),
          }));
          await reschedule(id);
        },

        reconcilePredictions: async () => {
          for (const id of get().items.map((it) => it.id)) {
            await reschedule(id);
          }
        },
      };
    },
    {
      name: 'grocery-v1',
      storage: zustandStorage,
      version: 1,
      // Backfill prediction fields so older persisted items don't crash the new UI.
      migrate: (persisted: unknown) => {
        const state = persisted as GroceryState;
        return {
          ...state,
          items: (state.items ?? []).map((it) => ({
            ...it,
            barcodes: it.barcodes ?? [],
            events: it.events ?? [],
          })),
        };
      },
    },
  ),
);
