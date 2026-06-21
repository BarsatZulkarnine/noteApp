/** Streak helpers from a list of 'YYYY-MM-DD' completion dates. */

import { addDays, subDays } from 'date-fns';
import { dateKey } from './date';

/**
 * Current streak = consecutive days with a completion, counting back from today.
 * If today isn't done yet but yesterday was, the streak still stands (until tomorrow).
 */
export function currentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  const today = new Date();
  let cursor = set.has(dateKey(today)) ? today : subDays(today, 1);
  if (!set.has(dateKey(cursor))) return 0;
  let streak = 0;
  while (set.has(dateKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/** The last `n` days (oldest→newest) with a done flag, for a mini history grid. */
export function lastNDays(dates: string[], n = 7): { key: string; done: boolean }[] {
  const set = new Set(dates);
  const out: { key: string; done: boolean }[] = [];
  const start = subDays(new Date(), n - 1);
  for (let i = 0; i < n; i++) {
    const k = dateKey(addDays(start, i));
    out.push({ key: k, done: set.has(k) });
  }
  return out;
}
