/**
 * Pure habit-progress mutations, shared by the app store and the home-screen
 * widget's headless task so both apply identical rules.
 *
 * Each function takes the day key explicitly (`today`) instead of reading the
 * clock, which keeps them deterministic and testable. They never mutate their
 * input — a new `byDate` (and a new Habit) is returned.
 */

import type { Habit } from './types';

const countOn = (h: Habit, today: string): number => h.byDate[today] ?? 0;

/** Set today's logged amount, clamped at 0, returning a new habit. */
function setDay(h: Habit, today: string, value: number): Habit {
  return { ...h, byDate: { ...h.byDate, [today]: Math.max(0, value) } };
}

/** Add one to today's count (count habits). */
export function applyIncrement(h: Habit, today: string): Habit {
  return setDay(h, today, countOn(h, today) + 1);
}

/** Subtract one from today's count, floored at 0. */
export function applyDecrement(h: Habit, today: string): Habit {
  return setDay(h, today, countOn(h, today) - 1);
}

/** Flip a 'check' habit done/undone for today (1 ↔ 0). */
export function applyToggle(h: Habit, today: string): Habit {
  return setDay(h, today, countOn(h, today) >= 1 ? 0 : 1);
}

/** Whether the habit's goal is met for the given day. */
export function isMet(h: Habit, today: string): boolean {
  const count = countOn(h, today);
  return h.kind === 'check' ? count >= 1 : count >= h.goal;
}
