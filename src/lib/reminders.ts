/**
 * Aggregates the day's actionable items from existing stores into a single
 * flat list for the Today "reminders" panel. Pure + `now`-injected so it stays
 * deterministic and unit-testable (same convention as prediction.ts / streak.ts).
 *
 * This derives entirely from data the app already holds — it does NOT schedule
 * or read OS notifications. It's an in-app "what needs attention today" inbox.
 */

import { differenceInCalendarDays } from 'date-fns';
import { dateKey } from './date';
import { isDuePrediction } from './prediction';
import type { GroceryItem, Habit, RecurringTodo } from './types';

export type ReminderTone = 'danger' | 'warning' | 'info';

export type Reminder = {
  id: string;
  icon: string;
  text: string;
  tone: ReminderTone;
  /** Route to navigate to when tapped. */
  href: string;
};

const TONE_RANK: Record<ReminderTone, number> = { danger: 0, warning: 1, info: 2 };

export type ReminderSources = {
  todos: RecurringTodo[];
  grocery: GroceryItem[];
  habits: Habit[];
};

/**
 * Build the reminder list, most-urgent first (expired/overdue → due soon → nudges).
 * Each grocery item yields at most one expiry and one restock reminder.
 */
export function buildReminders({ todos, grocery, habits }: ReminderSources, now: number): Reminder[] {
  const today = dateKey(new Date(now));
  const out: Reminder[] = [];

  // Todos due today that still have unchecked items.
  for (const t of todos) {
    if (t.kind === 'oneoff' && t.completed) continue;
    if (dateKey(new Date(t.nextDueAt)) !== today) continue;
    const remaining = t.items.filter((i) => !i.done).length;
    if (t.items.length > 0 && remaining === 0) continue;
    out.push({
      id: `todo:${t.id}`,
      icon: 'repeat-outline',
      text: t.title || 'Untitled',
      tone: 'info',
      href: `/todo/${t.id}`,
    });
  }

  // Grocery: expiry alerts + restock alerts (independent, one of each per item).
  for (const g of grocery) {
    if (g.expiryAt != null) {
      const days = differenceInCalendarDays(g.expiryAt, new Date(now));
      if (days < 0) {
        out.push({ id: `exp:${g.id}`, icon: 'hourglass-outline', text: `${g.name} expired`, tone: 'danger', href: `/grocery/${g.id}` });
      } else if (days <= 2) {
        const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
        out.push({ id: `exp:${g.id}`, icon: 'hourglass-outline', text: `${g.name} expires ${when}`, tone: 'warning', href: `/grocery/${g.id}` });
      }
    }
    if (g.low || isDuePrediction(g, now)) {
      out.push({ id: `low:${g.id}`, icon: 'cart-outline', text: `Restock ${g.name}`, tone: 'warning', href: `/grocery/${g.id}` });
    }
  }

  // Habit nudges: anything not yet met today.
  for (const h of habits) {
    const count = h.byDate[today] ?? 0;
    const done = h.kind === 'check' ? count >= 1 : count >= h.goal;
    if (done) continue;
    const text = h.kind === 'check' ? h.name : `${h.name} — ${Math.max(0, h.goal - count)} ${h.unit ?? ''} left`.trim();
    out.push({ id: `habit:${h.id}`, icon: h.icon, text, tone: 'info', href: `/habits/${h.id}` });
  }

  return out.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
}
