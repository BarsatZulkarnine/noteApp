# Notes & Pantry

A personal, single-user **note-taking app** for Android (built with Expo / React Native).
Notes are the heart of it; on top of that it adds **recurring todos with scheduled reminders**
and a dedicated **Grocery / Restock** screen.

All data is stored **locally on the device** (AsyncStorage) — no account, no server, no sync.

## Features

- **Notes** — free-text notes and checklist notes. Tap **+** to create; long-press a note to delete.
- **Todos** — recurring routines (daily / weekly / every-N-days) at a chosen time. Each fires a
  **local notification** when due and its checklist **auto-resets**. Tap the ↻ button to reset manually.
- **Grocery** — your pantry list. Tap the circle to flag an item **running low**; the
  **"Need to restock"** filter shows just those, as a ready shopping list.

## Tech

- Expo SDK 56, React Native, TypeScript, expo-router (file-based routing in `src/app`)
- Zustand + AsyncStorage for local persistence (`src/store`)
- expo-notifications for scheduled reminders (`src/lib/notifications.ts`)
- date-fns for recurrence math (`src/lib/recurrence.ts`)

## Project layout

```
src/app/                 # screens (expo-router)
  _layout.tsx            # root: notifications setup + overdue reconcile
  (tabs)/                # Notes | Todos | Grocery tab bar
  note/[id].tsx          # note editor (text or checklist)
  todo/[id].tsx          # recurring-todo editor (schedule + reminders)
src/store/               # notesStore, todosStore, groceryStore (Zustand)
src/lib/                 # notifications, recurrence, types, id
src/components/ui.tsx    # shared UI primitives
src/constants/theme.ts   # colors / spacing
```

## Development

Requires **Node.js** (already installed).

```bash
npm install
npx expo start          # then press 'a' for Android, or scan the QR with Expo Go
```

> Note: scheduled local notifications require a real dev build or the installed APK —
> they don't fire inside Expo Go reliably. The rest of the app works in Expo Go.

## Building the installable APK (local, no cloud account)

Prerequisites (installed during setup):

- **JDK 17** (Temurin) — `JAVA_HOME` set to its folder.
- **Android SDK** at `%LOCALAPPDATA%\Android\Sdk` — `ANDROID_HOME` set, with
  `platform-tools`, `platforms;android-36`, `build-tools;36.0.0`, and the NDK that RN requires.

### 1. Generate the native android/ project

```bash
npx expo prebuild --platform android
```

### 2a. Debug APK (quickest — installable, but larger/slower)

```bash
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

### 2b. Release APK (smaller, production build)

Generate a signing keystore once:

```bash
keytool -genkeypair -v -keystore release.keystore -alias app \
  -keyalg RSA -keysize 2048 -validity 10000
```

Add the signing config to `android/gradle.properties` and `android/app/build.gradle`,
then:

```bash
cd android
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

### 3. Install on your phone

Copy the `.apk` to the phone (USB / Google Drive), open it, and allow
"install from unknown sources". Grant the notification permission on first launch so
reminders work.
