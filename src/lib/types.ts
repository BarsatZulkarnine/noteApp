/** Shared domain types for notes, recurring todos, and grocery items. */

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type NoteType = 'text' | 'checklist';

/** Key into LABEL_COLORS, or undefined for no color label. */
export type LabelColor = 'red' | 'amber' | 'green' | 'blue' | 'purple';

/** A freehand stroke in a sketch (SVG path + style). */
export type Stroke = { d: string; color: string; width: number };

/** A saved drawing attached to a note. `w`/`h` are the canvas size it was drawn at (for scaling). */
export type Sketch = { id: string; strokes: Stroke[]; w: number; h: number };

export type Note = {
  id: string;
  title: string;
  type: NoteType;
  /** Used when type === 'text'. */
  body: string;
  /** Used when type === 'checklist'. */
  items: ChecklistItem[];
  /** Pinned notes sort to the top of the list. */
  pinned: boolean;
  /** Archived notes are hidden from the main list but not deleted. */
  archived: boolean;
  /** Freeform tags for grouping/filtering. */
  tags: string[];
  /** Optional color label. */
  color?: LabelColor;
  /** One-off reminder time (epoch ms); undefined = no reminder. */
  dueAt?: number;
  /** OS notification id for the one-off reminder. */
  reminderId?: string;
  /** Attached image file URIs. */
  images: string[];
  /** Attached freehand drawings. */
  sketches: Sketch[];
  /** Manual sort order (lower = higher in list). Falls back to updatedAt. */
  order?: number;
  createdAt: number;
  updatedAt: number;
};

export type RecurrenceKind = 'daily' | 'weekly' | 'interval';

export type Recurrence = {
  kind: RecurrenceKind;
  /** Minutes from midnight, e.g. 8 * 60 + 30 = 8:30am. */
  timeOfDay: number;
  /** Used when kind === 'weekly'. 1 = Sunday ... 7 = Saturday (matches expo-notifications). */
  weekday?: number;
  /** Used when kind === 'interval'. */
  everyNDays?: number;
};

export type TodoKind = 'recurring' | 'oneoff';

export type RecurringTodo = {
  id: string;
  title: string;
  kind: TodoKind;
  items: ChecklistItem[];
  /** Used when kind === 'recurring'. */
  recurrence: Recurrence;
  /** Used when kind === 'oneoff' — the single due date/time. */
  dueAt?: number;
  /** Used when kind === 'oneoff' — whether it's been completed. */
  completed?: boolean;
  /** Days this todo was marked done ('YYYY-MM-DD'), for streaks (recurring). */
  completedDates: string[];
  /** Epoch ms of the next time this todo is due to reset / remind. */
  nextDueAt: number;
  /** Last time the checklist was auto-reset. */
  lastResetAt: number;
  /** OS notification id so we can cancel/reschedule. */
  notificationId?: string;
  /** When false, no notification is scheduled. */
  remindersEnabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type HabitReminders = {
  enabled: boolean;
  /** Remind every N hours within the active window. */
  everyHours: number;
  /** Active window, in hours (24h). */
  startHour: number;
  endHour: number;
};

/** 'count' habits accumulate toward a goal (e.g. water); 'check' are once-a-day yes/no. */
export type HabitKind = 'count' | 'check';

export type Habit = {
  id: string;
  name: string;
  /** Ionicons glyph name. */
  icon: string;
  kind: HabitKind;
  /** Daily target (count habits). 'check' habits use 1. */
  goal: number;
  /** Unit label for count habits, e.g. "glasses". */
  unit?: string;
  /** Amount logged per day, keyed by 'YYYY-MM-DD'. */
  byDate: Record<string, number>;
  reminders: HabitReminders;
  /** OS notification ids for the scheduled reminder pings. */
  notificationIds: string[];
  createdAt: number;
};

/** A logged grocery event — the source of truth for restock prediction. */
export type PantryEventKind = 'purchase' | 'ranout' | 'low' | 'remaining';

export type PantryEvent = {
  id: string;
  kind: PantryEventKind;
  /** Epoch ms when it happened. */
  at: number;
  /** For 'purchase' = amount bought; for 'remaining' = amount left. In the item's `unit`. */
  qty?: number;
};

export type GroceryItem = {
  id: string;
  name: string;
  /** Aisle/section, e.g. "Produce". Empty = "Other". */
  category?: string;
  /** Free-text quantity, e.g. "2 bags". */
  qty?: string;
  /** True when running low and needs restocking. */
  low: boolean;
  /** Optional expiry date (epoch ms). */
  expiryAt?: number;
  /** OS notification id for the expiry alert. */
  expiryReminderId?: string;
  /** Optional note, e.g. preferred brand. */
  restockNote?: string;

  // --- Predictive restock (added v1 of the prediction feature) ---
  /** Known barcodes that resolve to this item (a merged item accumulates several). */
  barcodes?: string[];
  /** Consumption unit, e.g. "dozen", "loaf", "L", "kg". Guards merges. */
  unit?: string;
  /** Purchase / ran-out / remaining log driving the prediction. */
  events?: PantryEvent[];
  /** Seed consumption estimate (units/day), used until real cycles exist. */
  initialRatePerDay?: number;
  /** Buy-by buffer in days before the predicted run-out (default 2). */
  leadTimeDays?: number;
  /** Cached predicted run-out time (epoch ms); recomputed on reconcile. */
  predictedRunOutAt?: number;
  /** OS notification id for the "running low" restock alert. */
  restockNotificationId?: string;

  createdAt: number;
  updatedAt: number;
};
