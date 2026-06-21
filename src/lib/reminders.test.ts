import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReminders } from './reminders';
import type { GroceryItem, Habit, RecurringTodo } from './types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-21T12:00:00').getTime();
const todayKey = '2026-06-21';

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1', name: 'Water', icon: 'water-outline', kind: 'count', goal: 8, unit: 'glasses',
  byDate: {}, reminders: { enabled: false, everyHours: 3, startHour: 8, endHour: 22 },
  notificationIds: [], createdAt: NOW, ...over,
});

const grocery = (over: Partial<GroceryItem> = {}): GroceryItem => ({
  id: 'g1', name: 'Milk', low: false, events: [], createdAt: NOW, updatedAt: NOW, ...over,
});

const todo = (over: Partial<RecurringTodo> = {}): RecurringTodo => ({
  id: 't1', title: 'Chores', kind: 'recurring', items: [{ id: 'i1', text: 'x', done: false }],
  recurrence: { kind: 'daily', timeOfDay: 480 }, completedDates: [],
  nextDueAt: NOW, lastResetAt: NOW, remindersEnabled: true, createdAt: NOW, updatedAt: NOW, ...over,
});

const empty = { todos: [], grocery: [], habits: [] };

test('empty sources → no reminders', () => {
  assert.deepEqual(buildReminders(empty, NOW), []);
});

test('unmet count habit produces a nudge with remaining', () => {
  const r = buildReminders({ ...empty, habits: [habit({ byDate: { [todayKey]: 3 } })] }, NOW);
  assert.equal(r.length, 1);
  assert.equal(r[0].text, 'Water — 5 glasses left');
  assert.equal(r[0].href, '/habits/h1');
});

test('met habit produces no nudge', () => {
  const r = buildReminders({ ...empty, habits: [habit({ byDate: { [todayKey]: 8 } })] }, NOW);
  assert.deepEqual(r, []);
});

test('low grocery item produces a restock warning', () => {
  const r = buildReminders({ ...empty, grocery: [grocery({ low: true })] }, NOW);
  assert.equal(r.length, 1);
  assert.equal(r[0].text, 'Restock Milk');
  assert.equal(r[0].tone, 'warning');
});

test('expired item is danger, expiring-soon is warning', () => {
  const expired = buildReminders({ ...empty, grocery: [grocery({ expiryAt: NOW - 2 * DAY })] }, NOW);
  assert.equal(expired[0].tone, 'danger');
  assert.match(expired[0].text, /expired/);
  const soon = buildReminders({ ...empty, grocery: [grocery({ expiryAt: NOW + DAY })] }, NOW);
  assert.equal(soon[0].tone, 'warning');
  assert.match(soon[0].text, /tomorrow/);
});

test('todo due today with unchecked items appears; fully-done one does not', () => {
  const due = buildReminders({ ...empty, todos: [todo()] }, NOW);
  assert.equal(due.length, 1);
  const done = buildReminders({ ...empty, todos: [todo({ items: [{ id: 'i1', text: 'x', done: true }] })] }, NOW);
  assert.deepEqual(done, []);
});

test('reminders sort danger → warning → info', () => {
  const r = buildReminders(
    {
      todos: [todo()], // info
      grocery: [grocery({ low: true }), grocery({ id: 'g2', name: 'Yogurt', expiryAt: NOW - DAY })], // warning, danger
      habits: [],
    },
    NOW,
  );
  assert.deepEqual(r.map((x) => x.tone), ['danger', 'warning', 'info']);
});
