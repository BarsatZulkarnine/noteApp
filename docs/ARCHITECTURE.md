# Architecture & Contributor Guide

> Read this first if you're picking up this project cold. It explains what the app is,
> how it's organized, the conventions to follow, and how to run / build it.

## What this is

**Notes & Pantry** — a personal, **single-user** Android app (Expo / React Native).
It's a note-taking app at heart, plus a few life-admin tools. No account, no backend,
no sync: **all data lives locally on the device** via AsyncStorage.

Four tabs + detail screens:

| Tab / screen | Route | Purpose |
|---|---|---|
| Today | `src/app/(tabs)/index.tsx` | Dashboard: habits, restock count, todos due today, pinned notes |
| Notes | `src/app/(tabs)/notes.tsx` | Text + checklist notes; pin, color labels, tags + filter, archive, one-off reminder badge |
| Todos | `src/app/(tabs)/todos.tsx` | Recurring routines (remind + auto-reset, streaks) and one-off tasks; Done/Snooze |
| Grocery | `src/app/(tabs)/grocery.tsx` | Pantry grouped by category; "running low" flag, restock filter, expiry badges |
| Note editor | `src/app/note/[id].tsx` | Title, text/checklist, color, tags, reminder, markdown, archive, photo/sketch attachments, drag-reorder checklist |
| Drawing pad | `src/app/sketch/[id].tsx` | Freehand SVG sketch (colors/width/undo/clear) saved onto a note |
| Todo editor | `src/app/todo/[id].tsx` | Recurring (daily/weekly/every-N-days+time) or one-off (due date); reminders, steps |
| Grocery item | `src/app/grocery/[id].tsx` | Name, category, qty, expiry date, low flag |
| Shopping | `src/app/shopping.tsx` | Check-off list of low items; checking clears the low flag |
| Habits list | `src/app/habits/index.tsx` | All habits (Water is built-in); add count/check habits |
| Habit detail | `src/app/habits/[id].tsx` | Log/increment, weekly bar chart + streak, goal, reminders |
| Search | `src/app/search.tsx` | Search across notes/todos/grocery (modal) |

## Stack

- **Expo SDK 56**, React Native 0.85, TypeScript, **React Compiler enabled** (see `app.json`).
- **expo-router** — file-based routing. Routes live under `src/app`. The root layout
  (`src/app/_layout.tsx`) is a Stack; `(tabs)/_layout.tsx` is the bottom tab bar.
- **Zustand + `persist`** over **AsyncStorage** for all state (`src/store`). One store per domain.
- **expo-notifications** — scheduled local notifications (`src/lib/notifications.ts`).
- **date-fns** — date formatting + recurrence math.
- **react-native-gesture-handler** — swipe-to-delete rows.

## Directory map

```
src/
  app/                  # expo-router routes (see table above)
  store/                # Zustand stores — the source of truth
    notesStore.ts       #   notes CRUD + pin/archive/tags/color + one-off reminder + restore(undo); migrate v1
    todosStore.ts       #   recurring + one-off todos; notifications; markDone/snooze/reconcile; migrate v1
    groceryStore.ts     #   grocery items + low flag + category + expiry alert + restore(undo)
    habitsStore.ts      #   habits (count/check); Water is the default; daily log + reminders
    persist.ts          #   shared AsyncStorage JSON storage for zustand
  lib/
    types.ts            # all domain types (Note, RecurringTodo, GroceryItem, Habit…)
    notifications.ts    # permission/channel; scheduleRecurring / scheduleOneOff / scheduleIntervalReminders
    recurrence.ts       # computeNextDue() + human descriptions (PURE, unit-testable)
    streak.ts           # currentStreak() + lastNDays() from 'YYYY-MM-DD' lists (PURE)
    date.ts             # local-time dateKey('YYYY-MM-DD')
    images.ts           # expo-image-picker wrappers (pickFromLibrary/takePhoto)
    id.ts               # uid() generator
  components/
    ui.tsx              # design-system primitives: useColors, Card, Fab, Pill, Checkbox,
                        #   IconButton, Field, ProgressBar, WeekBars, SectionLabel, EmptyState
    swipe-row.tsx       # SwipeRow — reveals action buttons (Archive/Delete) on left-swipe
    sketch-thumb.tsx    # renders a saved Sketch (SVG) scaled into a tile
    toast.tsx           # useToastStore + ToastHost + toast() — the Undo snackbar
  constants/theme.ts    # Colors (light/dark), Spacing, Radius, Fonts
```

## Conventions (please follow these)

- **Theming is monochrome "ink & paper."** Never hardcode colors in screens. Pull from
  `useColors()` (from `components/ui`). The accent is `tint` (near-black in light, near-white
  in dark); draw text/icons on a `tint` surface with `onTint`. Status colors (`danger`,
  `warning`, `success`) are intentionally muted — use them only for status, not decoration.
- **Spacing/Radius come from `constants/theme`** (`Spacing.three`, `Radius.md`, …). Avoid magic numbers.
- **Zustand selector rule (important):** never return a *newly created* array/object from a
  selector — e.g. `useStore(s => s.items.filter(...))`. With React 19 + zustand v5 that returns a
  fresh reference every render and triggers a **"getSnapshot should be cached" infinite loop**.
  Instead select the raw array (`s => s.items`) and derive with `useMemo` in the component.
- **Deletes never use confirm dialogs.** Wrap rows in `SwipeRow`, delete immediately, and call
  `toast('… deleted', 'Undo', () => restoreX(item))`. Every store that deletes has a `restore*`
  action for this. No `Alert.alert` for confirmations.
- **Notifications:** any change to a todo's schedule/reminder, or water reminder settings, must
  cancel the old OS notification id(s) and reschedule. Stores already do this — keep it that way.
  Web has no notifications; the lib no-ops on `Platform.OS === 'web'`.
- **Data shape changes:** AsyncStorage holds old data. Prefer additive/optional fields (default
  falsy) over renames. When you add fields, bump the store `version` and add a `migrate` that
  backfills them (see `notesStore`/`todosStore`).
- **Typed routes:** `app.json` has `experiments.typedRoutes`. Newly-added route files aren't in the
  generated route types until the dev server regenerates them, so `tsc` may reject a brand-new
  `/route/${id}`. Cast with `as Href` (`import { type Href } from 'expo-router'`) — that's the
  established pattern here.

## Running & iterating (fast loop — no APK needed)

The whole UI runs in the browser, which is the quick way to iterate on layout/logic.
Native-only bits (real push notifications, the native time picker) need the device.

```bash
npm install
npm run web          # http://localhost:8081  ← open in a browser
# or: npx expo start  → press 'a' (Android device/emulator) or scan QR in Expo Go
```

There's a `.claude/launch.json` ("web" config) so Claude's preview tooling can drive the web
build and screenshot it.

**Gotcha:** after adding native deps (e.g. `react-native-svg`, `react-native-draggable-flatlist`),
Metro can serve a stale module graph and fail with a bogus "Unable to resolve `.../context/cellContext`"
(the file exists). Restart the dev server with `npx expo start -c` (clear cache) and it resolves.

## Building the installable APK (local, no cloud account)

Toolchain is installed on the dev machine: **Node, JDK 17, Android SDK** (`platform-36`,
`build-tools;36.0.0`, `ndk;27.1.12297006`, `cmake`), with `JAVA_HOME`/`ANDROID_HOME` set.
Release builds are signed with the auto-generated debug keystore (fine for personal use).

```bash
npx expo prebuild --platform android      # (re)generate android/ when native deps change
cd android
./gradlew assembleRelease                 # → app/build/outputs/apk/release/app-release.apk
```

First build compiles native C++ from source (~15 min); afterwards it's cached and fast.
See the repo `README.md` for the phone-install steps.

## Good next tasks / ideas

- Per-architecture APK splits to shrink the ~100 MB universal APK.
- One-off (non-recurring) reminders on notes.
- Backup & restore (export/import all stores as a JSON file).
- Tags/folders or color labels for notes.
- A real app icon (currently the default Expo icon).
- Unit tests for `lib/recurrence.ts` (it's pure and the trickiest logic).
