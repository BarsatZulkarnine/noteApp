/**
 * Pure restock-prediction helpers. No I/O, no Date.now() — pass `now` in so this
 * stays deterministic and unit-testable (same convention as recurrence.ts / streak.ts).
 *
 * Model: a "cycle" runs from a purchase to the next ran-out (or to the next
 * purchase if no ran-out was logged). consumption rate = qty bought / cycle days.
 * Cycles are blended with an exponential moving average so recent behaviour
 * dominates and the estimate self-corrects. Before any real cycle we fall back to
 * the user's seed estimate (`initialRatePerDay`).
 */

import type { GroceryItem, PantryEvent } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Weight of the most recent cycle in the moving average (0..1). Higher = more reactive. */
const EMA_ALPHA = 0.4;
/** Ignore implausibly short cycles (double-taps, same-day mistakes). */
const MIN_CYCLE_DAYS = 0.5;
/** Default buy-by buffer before predicted run-out. */
export const DEFAULT_LEAD_TIME_DAYS = 2;

const byTime = (a: PantryEvent, b: PantryEvent) => a.at - b.at;

/**
 * Learned consumption rate in units/day, or `undefined` if there's nothing to go on.
 * Uses an EMA over completed cycles; falls back to `initialRatePerDay` when no
 * cycle has completed yet.
 */
export function consumptionRatePerDay(
  events: PantryEvent[],
  initialRatePerDay?: number,
): number | undefined {
  const sorted = [...events].sort(byTime);
  const purchases = sorted.filter((e) => e.kind === 'purchase');

  let ema: number | undefined;
  for (let i = 0; i < purchases.length; i++) {
    const p = purchases[i];
    const qty = p.qty ?? 0;
    if (qty <= 0) continue;

    // Cycle ends at the earlier of: the first ran-out after this purchase, or the
    // next purchase. If neither exists, the cycle is still open — skip it.
    const ranoutAt = sorted.find((e) => e.kind === 'ranout' && e.at > p.at)?.at;
    const nextAt = purchases[i + 1]?.at;
    const end =
      ranoutAt != null && nextAt != null ? Math.min(ranoutAt, nextAt) : ranoutAt ?? nextAt;
    if (end == null) continue;

    const days = (end - p.at) / DAY_MS;
    if (days < MIN_CYCLE_DAYS) continue;

    const rate = qty / days;
    ema = ema == null ? rate : EMA_ALPHA * rate + (1 - EMA_ALPHA) * ema;
  }

  if (ema != null) return ema;
  if (initialRatePerDay != null && initialRatePerDay > 0) return initialRatePerDay;
  return undefined;
}

/**
 * Predicted run-out time (epoch ms), or `undefined` when it can't be projected
 * (no rate, or no stock anchor). Anchors on the most recent "remaining" update if
 * there is one newer than the last purchase, otherwise on the last purchase.
 */
export function predictRunOutAt(item: GroceryItem, now: number): number | undefined {
  const events = item.events ?? [];
  const rate = consumptionRatePerDay(events, item.initialRatePerDay);
  if (rate == null || rate <= 0) return undefined;

  const sorted = [...events].sort(byTime);
  if (sorted.length === 0) return undefined;

  // Currently marked out → run-out already happened (at that event).
  const last = sorted[sorted.length - 1];
  if (last.kind === 'ranout') return last.at;

  const reversed = [...sorted].reverse();
  const lastPurchase = reversed.find((e) => e.kind === 'purchase');
  const lastRemaining = reversed.find((e) => e.kind === 'remaining');

  let anchorAt: number | undefined;
  let stock: number | undefined;
  if (lastRemaining && (!lastPurchase || lastRemaining.at >= lastPurchase.at)) {
    anchorAt = lastRemaining.at;
    stock = lastRemaining.qty ?? 0;
  } else if (lastPurchase) {
    anchorAt = lastPurchase.at;
    stock = lastPurchase.qty ?? 0;
  }
  if (anchorAt == null || stock == null) return undefined;
  if (stock <= 0) return anchorAt;

  return anchorAt + (stock / rate) * DAY_MS;
}

/** Buy-by time = run-out minus the lead-time buffer. */
export function buyByAt(runOutAt: number, leadTimeDays: number = DEFAULT_LEAD_TIME_DAYS): number {
  return runOutAt - leadTimeDays * DAY_MS;
}

/** Whole days from `now` until `at` (negative = overdue). For "runs out in ~N days" hints. */
export function daysUntil(at: number, now: number): number {
  return Math.round((at - now) / DAY_MS);
}

/** True when the item is predicted to need restocking by `now` (past its buy-by). */
export function isDuePrediction(item: GroceryItem, now: number): boolean {
  const runOut = item.predictedRunOutAt ?? predictRunOutAt(item, now);
  if (runOut == null) return false;
  return now >= buyByAt(runOut, item.leadTimeDays);
}

/**
 * Whole days until predicted run-out, or `null` when there's nothing to predict
 * yet (no rate / no seed). Negative means already overdue. For "runs out in ~N
 * days" hints; UI does the wording.
 */
export function runOutInDays(item: GroceryItem, now: number): number | null {
  const runOut = item.predictedRunOutAt ?? predictRunOutAt(item, now);
  if (runOut == null) return null;
  return daysUntil(runOut, now);
}
