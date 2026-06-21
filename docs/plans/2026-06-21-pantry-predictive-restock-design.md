# Barcode Scanning + Predictive Restock — Design

> Status: **implemented** 2026-06-21 (design agreed via brainstorming the same day).
> Feature owner: single user (personal app).
>
> Shipped: `src/lib/prediction.ts` (+ `prediction.test.ts`, 14 tests), `src/lib/lookup.ts`
> (Open Food Facts), extended `GroceryItem`/`PantryEvent` in `src/lib/types.ts`,
> `groceryStore` actions + v1 migration, launch-time `reconcilePredictions()`,
> grocery detail tracking UI + list "runs out" badge, and `src/app/scan.tsx`
> (expo-camera). ⚠️ Scanning needs a native rebuild (`expo prebuild` +
> `assembleRelease`) — expo-camera is a native module; web shows a device-only state.

## Goal

Let the user scan grocery barcodes to log purchases, learn each item's
consumption cadence from a logged history, and **predict when an item will run
out** — auto-flagging it for restock and sending a local "buy soon" notification.
Unscannable items (e.g. butcher meat) are added manually but get the same
predictions. Items of different brands can be **merged** into one tracked thing
with a shared history.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Data durability | AsyncStorage + "install-over" is enough. **Best-effort**, no backup/export for v1. ⚠️ Caveat below. |
| Logged signals | Event log: **purchases** + **"ran out"** taps + **occasional "remaining"** updates. Future "Hey Google, almost out of eggs" drops onto the same event path. |
| Brand consolidation | **Lazy merge**: every item starts standalone; a "Merge into…" action fuses histories and remembers the barcode. Merge requires **matching units**, keeps the target's unit. |
| Prediction model | **Consumption-rate with self-correcting EMA** (Option A). |
| Barcode lookup | **Hybrid**: try Open Food Facts online, fall back to manual naming. Stays fully usable offline. |
| Prediction action | **Auto-flag `low`** + dashboard Restock count + "runs out in ~N days" hint + **local notification**. |

> ⚠️ **Durability caveat:** AsyncStorage survives an install-over with the *same*
> signing key, but is wiped by uninstall, "Clear data", or a signing-key change
> (release builds currently use the auto-generated debug keystore). If the key
> ever changes, data is lost. A JSON export/import is the eventual safety net
> (already on the ideas list) — deliberately out of scope for v1.

## Data model

Extend the existing flat `GroceryItem` (it *becomes* the tracked thing) rather
than introduce a parallel entity. Reuses all current grocery UI, the `low` flag,
shopping list, and dashboard count.

New **additive, optional** fields on `GroceryItem` (`src/lib/types.ts`):

```ts
barcodes?: string[];          // known barcodes that resolve to this item
unit?: string;                // "dozen" | "loaf" | "L" | "kg" … display + merge guard
events?: PantryEvent[];       // the log — source of truth for prediction
initialRatePerDay?: number;   // seed estimate, used until real cycles exist
leadTimeDays?: number;        // buy-by buffer (default 2)
predictedRunOutAt?: number;   // cached prediction (epoch ms); recomputed on reconcile
restockNotificationId?: string; // separate from expiryReminderId
```

New event type:

```ts
type PantryEventKind = 'purchase' | 'ranout' | 'low' | 'remaining';
type PantryEvent = {
  id: string;
  kind: PantryEventKind;
  at: number;     // epoch ms
  qty?: number;   // purchase = amount bought; remaining = amount left (item's unit)
};
```

**Migration:** bump `groceryStore` `version`; `migrate` backfills `barcodes: []`
and `events: []` so older persisted items don't crash.

## Prediction engine — `src/lib/prediction.ts` (pure, unit-testable)

Mirrors the `recurrence.ts` / `streak.ts` convention (pure functions, no I/O).

- **Cycles** from the sorted event log: a cycle = a `purchase` → the next
  `ranout` (or → next `purchase` if no ranout was logged). `rate = qty ÷ cycleDays`.
- **Self-correcting average:** exponential moving average across cycles
  (`alpha ≈ 0.4`, recent-weighted). Before any real cycle, use `initialRatePerDay`.
- **Run-out projection:** `anchor + stock ÷ rate`, where the anchor is the most
  recent `remaining` event (if newer than the last purchase) else the last
  `purchase`; `stock` is that event's qty. A trailing `ranout` ⇒ run-out = now.
- **Buy-by** = `runOut − leadTimeDays`.
- **Guards:** ignore cycles < ½ day; return `undefined` when there's no data and
  no seed (UI shows "learning…").

Proposed API:
```ts
consumptionRatePerDay(events, initialRatePerDay?): number | undefined
predictRunOutAt(item, now): number | undefined
buyByAt(runOutAt, leadTimeDays): number
```

## Scanning + hybrid lookup — `src/app/scan.tsx`

- Add **`expo-camera`** (`CameraView`, `useCameraPermissions`); barcode types:
  `ean13, ean8, upc_a, upc_e, code128`.
- On scan, `resolveBarcode(code)` searches every item's `barcodes`:
  - **Known** → record a `purchase` event on that item (qty defaults to last
    purchase qty, editable).
  - **Unknown** → attempt Open Food Facts
    (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`,
    `product_name` / `brands`); open a "new item" sheet prefilled with name +
    barcode where the user sets unit + initial estimate + qty. On offline/no-hit,
    same sheet with a blank name.
- **Web:** no camera → screen shows a "device only" state (manual add still
  works), matching the `Platform.OS === 'web'` no-op pattern used for notifications.
- **Permissions:** camera permission string in `app.json` (iOS
  `NSCameraUsageDescription`, Android `CAMERA`).

## Store, reconcile, UI, notifications

**`groceryStore` new actions:**
- `recordEvent(id, kind, qty?)` — append a `PantryEvent`, then recompute that
  item's prediction + reschedule its restock notification.
- `addBarcode(id, code)` / `resolveBarcode(code) → id | undefined`.
- `mergeItems(sourceId, targetId)` — re-point source events onto target, union
  barcodes, delete source, reschedule. **Same-unit guard** (no-op + surfaced
  message if units differ).
- `setEstimate(id, { unit, initialRatePerDay, leadTimeDays })`.
- `reconcilePredictions()` — recompute `predictedRunOutAt` for all items; set
  `low = true` when `now ≥ buyBy`; schedule/cancel restock notifications.

**Reconcile on app launch** (mirrors the existing todos reconcile) keeps
predictions current without per-second work.

**UI:**
- Scan entry point on the Grocery tab (FAB or header button) → `/scan`.
- Grocery item detail (`src/app/grocery/[id].tsx`): unit, initial estimate, lead
  time, barcode list, recent event history, quick **Bought / Ran out / Update
  remaining** buttons, and **Merge into…** (picker filtered to same unit).
- Grocery list rows: "runs out in ~N days" hint alongside the existing low badge.
- Theming/spacing per conventions (`useColors`, `Spacing`/`Radius`); deletes via
  `SwipeRow` + Undo `toast`.

**Notifications** (`src/lib/notifications.ts`): add a `scheduleRestock` helper —
local "X running low — buy in ~N days" fired at buy-by; canceled/rescheduled
whenever events change (per the notification convention). Web no-ops.

## Testing

- `src/lib/prediction.ts` is pure → unit tests (cycles, EMA self-correction,
  remaining re-anchor, degenerate-cycle guards, no-data fallback). Also satisfies
  the standing "unit tests for the pure logic" idea.

## New dependencies

- `expo-camera` (via `npx expo install expo-camera`). Native-only scanning;
  rebuild the dev client / APK after adding (prebuild + assembleRelease).
- Network: Open Food Facts is a public, no-key REST endpoint; failures degrade to
  manual entry.

## Out of scope (v1, YAGNI)

- JSON backup/export-import (the real fix for the durability caveat).
- Voice / "Hey Google" integration (the event-log design makes it a clean later
  add — it just calls `recordEvent(id, 'low')`).
- Online product images, multi-pack/unit conversion on merge.
```
