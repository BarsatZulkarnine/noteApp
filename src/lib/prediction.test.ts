import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buyByAt,
  consumptionRatePerDay,
  DAY_MS,
  DEFAULT_LEAD_TIME_DAYS,
  daysUntil,
  isDuePrediction,
  predictRunOutAt,
} from './prediction';
import type { GroceryItem, PantryEvent } from './types';

let seq = 0;
const ev = (kind: PantryEvent['kind'], at: number, qty?: number): PantryEvent => ({
  id: `e${seq++}`,
  kind,
  at,
  qty,
});

const T0 = 1_700_000_000_000; // fixed epoch anchor — keep tests deterministic
const day = (n: number) => T0 + n * DAY_MS;

const item = (events: PantryEvent[], extra: Partial<GroceryItem> = {}): GroceryItem => ({
  id: 'g1',
  name: 'Eggs',
  low: false,
  events,
  createdAt: T0,
  updatedAt: T0,
  ...extra,
});

test('no events, no seed → undefined rate', () => {
  assert.equal(consumptionRatePerDay([]), undefined);
});

test('falls back to seed rate before any cycle completes', () => {
  assert.equal(consumptionRatePerDay([ev('purchase', day(0), 12)], 2), 2);
});

test('single completed purchase→ranout cycle gives qty/days', () => {
  // 12 units consumed over 6 days = 2/day
  const rate = consumptionRatePerDay([ev('purchase', day(0), 12), ev('ranout', day(6))]);
  assert.equal(rate, 2);
});

test('purchase→next-purchase counts as a cycle when no ranout', () => {
  // bought 14, next purchase 7 days later → 2/day
  const rate = consumptionRatePerDay([ev('purchase', day(0), 14), ev('purchase', day(7), 14)]);
  assert.equal(rate, 2);
});

test('EMA weights the most recent cycle (self-correction)', () => {
  // cycle 1: 2/day, cycle 2: 4/day. EMA alpha 0.4 → 0.4*4 + 0.6*2 = 2.8
  const rate = consumptionRatePerDay([
    ev('purchase', day(0), 12),
    ev('ranout', day(6)),
    ev('purchase', day(6), 12),
    ev('ranout', day(9)),
  ]);
  assert.ok(rate !== undefined);
  assert.ok(Math.abs(rate! - 2.8) < 1e-9, `expected ~2.8, got ${rate}`);
});

test('ignores degenerate sub-half-day cycles', () => {
  // a double-tapped purchase/ranout within hours should not poison the rate
  const rate = consumptionRatePerDay(
    [ev('purchase', T0, 12), ev('ranout', T0 + DAY_MS / 8)],
    1.5,
  );
  assert.equal(rate, 1.5); // falls through to seed
});

test('predictRunOutAt projects from last purchase', () => {
  // 12 bought at day 0, rate 2/day (from prior cycle) → out at day 6 from anchor
  const it = item([
    ev('purchase', day(0), 12),
    ev('ranout', day(6)),
    ev('purchase', day(6), 12),
  ]);
  const out = predictRunOutAt(it, day(7));
  assert.equal(out, day(12)); // anchor day6 + 12/2 days
});

test('remaining event re-anchors the projection', () => {
  const it = item([
    ev('purchase', day(0), 12),
    ev('ranout', day(6)),
    ev('purchase', day(6), 12),
    ev('remaining', day(9), 2), // only 2 left at day 9, rate 2/day → out day 10
  ]);
  const out = predictRunOutAt(it, day(9));
  assert.equal(out, day(10));
});

test('trailing ranout means already out (run-out = that event)', () => {
  const it = item([
    ev('purchase', day(0), 12),
    ev('ranout', day(6)),
    ev('purchase', day(6), 12),
    ev('ranout', day(8)),
  ]);
  assert.equal(predictRunOutAt(it, day(9)), day(8));
});

test('no rate and no seed → cannot project', () => {
  assert.equal(predictRunOutAt(item([ev('purchase', day(0), 12)]), day(1)), undefined);
});

test('seed rate alone projects from the only purchase', () => {
  const it = item([ev('purchase', day(0), 10)], { initialRatePerDay: 1 });
  assert.equal(predictRunOutAt(it, day(1)), day(10));
});

test('buyByAt subtracts the lead-time buffer', () => {
  assert.equal(buyByAt(day(10), 2), day(8));
  assert.equal(buyByAt(day(10)), day(10 - DEFAULT_LEAD_TIME_DAYS));
});

test('daysUntil rounds to whole days', () => {
  assert.equal(daysUntil(day(3), day(0)), 3);
  assert.equal(daysUntil(day(0), day(3)), -3);
});

test('isDuePrediction true once past buy-by', () => {
  const it = item([ev('purchase', day(0), 10)], {
    initialRatePerDay: 1,
    predictedRunOutAt: day(10),
    leadTimeDays: 2,
  });
  assert.equal(isDuePrediction(it, day(7)), false); // buy-by is day 8
  assert.equal(isDuePrediction(it, day(8)), true);
});
