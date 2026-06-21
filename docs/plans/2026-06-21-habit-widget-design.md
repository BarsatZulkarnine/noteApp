# Android home-screen habit widget — design

**Status:** approved design, implementation pending
**Date:** 2026-06-21
**Branch:** `feat/habit-widget`

## 1. Goal & scope

Add an **interactive Android home-screen widget** for habits. From the home screen
the user can see progress and tap to log a habit *without opening the app*.

Two widget layouts ship together:

- **A · Habit ring (2×2)** — a single "pinned" habit shown as a progress ring.
  Tapping the ring logs progress (increment a count habit / toggle a check habit).
- **B · Today's habits (4×2)** — a compact list of all habits with per-row
  quick-complete buttons.

Decisions locked during brainstorming:

- Concepts **A and B only** — no todos widget (concept C was dropped).
- **Interactive from the start** (not a read-only v1).
- Library: **`react-native-android-widget`** — lets us define widget UI in React,
  ships an Expo config plugin, and runs a headless `widgetTaskHandler` for taps so
  the widget can read/write the same `habits-v1` AsyncStorage the app uses.
- The ring tracks a **user-pinned habit** (configurable; falls back gracefully).
- Theme **follows the system** light/dark setting.
- **Android-only.** On web/iOS every widget entry point is a no-op.

Out of scope: iOS widgets, lock-screen widgets, resizable/responsive reflow beyond
the two fixed sizes, multi-habit rings.

## 2. Architecture

```
┌─────────────────┐         ┌──────────────────────────┐
│  App (RN/Expo)  │         │  Widget (headless + UI)  │
│                 │         │                          │
│  habitsStore ──┐│         │ widgetTaskHandler        │
│  (zustand) ────┼┼── AsyncStorage ──┼─ reads habits-v1│
│                ││  (habits-v1)     │ applies mutation │
│  settingsStore─┘│         │ requestWidgetUpdate()    │
│  (widgetHabitId)│         └──────────────────────────┘
└─────────────────┘
        ▲                              │
        └──── AppState 'active' ───────┘
             rehydrate() to pick up
             widget-side mutations
```

**Shared mutation core (`src/lib/habit-mutations.ts`).** Both the app store and the
widget task handler mutate a habit's `byDate` map. To guarantee they behave
identically, the mutation logic lives in pure, `today`-injected functions:
`applyIncrement`, `applyDecrement`, `applyToggle`, `isMet`. The store actions and
the headless handler both call these; neither re-implements the rules.

**Cross-process sync.** The widget's headless task writes `habits-v1` directly via
AsyncStorage. The running app's in-memory zustand state then goes stale. Fix:

- App store actions call `requestWidgetUpdate()` after mutating, so the widget
  redraws from fresh data.
- The root layout subscribes to `AppState`; on `'active'` it calls
  `useHabitsStore.persist.rehydrate()` so the app picks up any widget-side writes.

## 3. Data & settings

- **`widgetHabitId`** added to `settingsStore` (+ a setter). Identifies the habit the
  ring (concept A) renders. Persisted in `settings-v1`.
- **`resolveWidgetHabit(habits, id)`** — returns the pinned habit, or falls back to
  the first habit, or `null` if there are none. Keeps the widget robust when the
  pinned habit is deleted or the list is empty.
- A **"Show on widget"** control on the habit detail screen (`habits/[id]`) sets
  `widgetHabitId`.

## 4. Implementation phases (one revertible commit each)

- **Phase 0 — shared mutation core.** `src/lib/habit-mutations.ts` (pure,
  `today`-injected) + tests. Refactor `habitsStore` `increment`/`decrement`/
  `toggleCheck` to delegate to it. *Verifiable here on web; de-risks everything
  downstream.*
- **Phase 1 — settings plumbing.** `widgetHabitId` + setter in `settingsStore`;
  `resolveWidgetHabit`; "Show on widget" toggle on `habits/[id]`.
- **Phase 2 — library + native config.** `npx expo install react-native-android-widget`;
  config plugin in `app.json` declaring both widget sizes; `widgetTaskHandler`
  skeleton + registration in the entry point.
- **Phase 3 — widget UIs.** `RingWidget` (A, 2×2) and `TodayHabitsWidget` (B, 4×2)
  as `react-native-android-widget` component trees, theme-aware via the system
  light/dark flag.
- **Phase 4 — interactivity + sync.** `clickAction` handlers (inc/toggle/open via
  `clickActionData {habitId, op}`); `requestWidgetUpdate()` in store actions;
  AppState→`rehydrate()` in root layout.
- **Phase 5 — edge cases + docs.** Empty/seed default, deleted-pin fallback,
  update `docs/ARCHITECTURE.md`.

## 5. Build note

The APK is built on a separate Windows machine. `.claude/launch.json` and
`package-lock.json` must **not** be committed — they are environment-local. Native
changes (`app.json` plugin, any `android/` regeneration) land in source only; the
prebuild + `gradlew assembleRelease` happens on the build machine.
