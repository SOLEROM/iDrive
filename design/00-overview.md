# Overview — Kids Rides & Classes PWA (rewrite)

## What the app is
A small-group **coordination app** for parents to share children's classes and
shared rides. Not a personal calendar — the value is in a family/friends group
seeing the same state in real time.

## Stack (unchanged)
React 18 · TypeScript (strict) · Vite · Vitest · Firebase Firestore + Auth ·
Workbox service worker · React Router · SheetJS (backup export only).

## Why a rewrite
The current codebase grew by patching:
- `AppContext` is a 330-line god-object doing auth, group lookup, 5 listeners,
  all mutations, config split and xlsx export.
- Business logic (activity → event generation) lives in a screen.
- `Activity` carries both legacy single `startTime`/`endTime` **and** a per-day
  `dayTimes` map, with inline migration.
- `AppLocalConfig` mixes device-only flags, shared-group data, derived
  auth fields and a dead `syncIntervalMinutes`.
- `CommonActivityEditorScreen`, legacy xlsx **parse** path, and
  `VisibilityScope.PRIVATE` are dead code.
- `conflictDetector` exists but nothing calls it. `RideAssignment` state
  machine has 6 states but the UI uses only 3.
- No service layer; Firestore imports leak into the provider.
- No tests above the domain layer.

## Goals of the rewrite
1. Keep **every feature** that exists today (see `17-features-inventory.md`).
2. Clean separation of **domain · data · state · ui** layers.
3. One responsibility per file; provider delegates to thin repos/services.
4. Delete dead code on the way in (don't carry legacy fields forward).
5. Wire up the pieces that were drafted but never used (conflict UI,
   full ride state machine, i18n plumbing).
6. Testability at every layer — domain, repo (fake Firestore), screen hooks.
7. No behaviour changes visible to the user except bug fixes.

## Non-goals (for this rewrite)
- Web Push notifications (scaffold only — `14-notifications.md`).
- Hebrew UI completion beyond what `i18n.ts` already covers.
- Migration away from Firestore / away from `families.yaml`.
- Native wrapping (Capacitor, etc.).
