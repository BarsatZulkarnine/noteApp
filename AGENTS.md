# Notes & Pantry

A personal, single-user Android notes app (Expo / React Native) with recurring todos,
a grocery/restock list, and a water tracker. All data is local (AsyncStorage). No backend.

**👉 Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before changing code.** It covers the
structure, the data stores, the theming/zustand/delete conventions, and how to run + build.

## Expo HAS CHANGED

This is **Expo SDK 56**. Read the exact versioned docs at
https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Quick reference

- Run the fast dev loop: `npm run web` → http://localhost:8081 (UI works in-browser).
- Routes: `src/app` (expo-router). State: `src/store` (Zustand). Logic: `src/lib`. UI kit: `src/components/ui.tsx`.
- Theme is **monochrome ink/paper** — always use `useColors()`, never hardcode colors.
- Deletes use `SwipeRow` + an Undo `toast()`, never confirm dialogs.
- Build APK: `npx expo prebuild --platform android` then `cd android && ./gradlew assembleRelease`.
