import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyDecrement, applyIncrement, applyToggle, isMet } from './habit-mutations';
import type { Habit } from './types';

const TODAY = '2026-06-21';

const habit = (extra: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Water',
  icon: 'water-outline',
  kind: 'count',
  goal: 8,
  unit: 'glasses',
  byDate: {},
  reminders: { enabled: false, everyHours: 2, startHour: 8, endHour: 22 },
  notificationIds: [],
  createdAt: 0,
  ...extra,
});

test('applyIncrement adds one to today and leaves other days untouched', () => {
  const h = habit({ byDate: { [TODAY]: 2, '2026-06-20': 5 } });
  const next = applyIncrement(h, TODAY);
  assert.equal(next.byDate[TODAY], 3);
  assert.equal(next.byDate['2026-06-20'], 5);
});

test('applyIncrement starts from 0 when today is unset', () => {
  const next = applyIncrement(habit(), TODAY);
  assert.equal(next.byDate[TODAY], 1);
});

test('applyDecrement floors at 0', () => {
  const h = habit({ byDate: { [TODAY]: 0 } });
  assert.equal(applyDecrement(h, TODAY).byDate[TODAY], 0);
});

test('applyToggle flips 0 -> 1 and 1 -> 0', () => {
  const off = habit({ kind: 'check', goal: 1 });
  const on = applyToggle(off, TODAY);
  assert.equal(on.byDate[TODAY], 1);
  assert.equal(applyToggle(on, TODAY).byDate[TODAY], 0);
});

test('mutations do not mutate the input habit', () => {
  const h = habit({ byDate: { [TODAY]: 1 } });
  const snapshot = h.byDate[TODAY];
  applyIncrement(h, TODAY);
  assert.equal(h.byDate[TODAY], snapshot);
});

test('isMet for count habits compares against goal', () => {
  assert.equal(isMet(habit({ byDate: { [TODAY]: 7 } }), TODAY), false);
  assert.equal(isMet(habit({ byDate: { [TODAY]: 8 } }), TODAY), true);
});

test('isMet for check habits is true at >= 1', () => {
  const check = habit({ kind: 'check', goal: 1 });
  assert.equal(isMet(check, TODAY), false);
  assert.equal(isMet({ ...check, byDate: { [TODAY]: 1 } }, TODAY), true);
});
