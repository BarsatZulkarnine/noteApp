/** Pure helpers for computing when a recurring todo is next due. */

import { addDays } from 'date-fns';
import type { Recurrence } from './types';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTimeOfDay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/** A short human description of a recurrence rule. */
export function describeRecurrence(r: Recurrence): string {
  const time = formatTimeOfDay(r.timeOfDay);
  if (r.kind === 'daily') return `Every day at ${time}`;
  if (r.kind === 'weekly') {
    const label = WEEKDAY_LABELS[(r.weekday ?? 1) - 1];
    return `Every ${label} at ${time}`;
  }
  const n = r.everyNDays ?? 1;
  return n === 1 ? `Every day at ${time}` : `Every ${n} days at ${time}`;
}

/**
 * Compute the next due Date strictly after `from` for the given recurrence.
 */
export function computeNextDue(r: Recurrence, from: Date = new Date()): Date {
  const hour = Math.floor(r.timeOfDay / 60);
  const minute = r.timeOfDay % 60;

  const at = (base: Date) => {
    const d = new Date(base);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  if (r.kind === 'weekly') {
    const targetDow = (r.weekday ?? 1) - 1; // 0=Sun..6=Sat
    let candidate = at(from);
    let delta = (targetDow - candidate.getDay() + 7) % 7;
    candidate = at(addDays(from, delta));
    if (candidate <= from) candidate = at(addDays(candidate, 7));
    return candidate;
  }

  if (r.kind === 'interval') {
    const step = Math.max(1, r.everyNDays ?? 1);
    let candidate = at(from);
    while (candidate <= from) candidate = at(addDays(candidate, step));
    return candidate;
  }

  // daily
  let candidate = at(from);
  if (candidate <= from) candidate = at(addDays(from, 1));
  return candidate;
}
