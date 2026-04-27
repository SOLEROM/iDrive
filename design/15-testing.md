# Testing Strategy

## What exists today (28 cases, all Vitest)
- `recurrence.test.ts` — 7
- `rideStateMachine.test.ts` — 14
- `conflictDetector.test.ts` — 7

All pure domain — fast, good coverage of those modules, no coverage above.

## Rewrite target: same `tests/` root, four layers

### 1. Domain unit (keep + extend)
- existing files
- **new** `activityExpander.test.ts` — the expansion algorithm moved out of
  the screen; cases:
  - repeating weekly, 3 days/week
  - one-time activity → single event
  - empty `dayTimes` → every day of window
  - idempotent re-save (same ids)
  - `endTime` missing → falls back to `startTime`
- **new** `timeWindow.test.ts` — today/week/month window boundaries.
- **new** `ids.test.ts` — deterministic id builders.

### 2. Data / repo tests (new)
Mock Firestore via `firebase/rules-unit-testing` OR an in-memory fake at the
repo boundary. Prefer the in-memory fake (smaller dep, faster):
- `eventsRepo.test.ts` — upsert stamps updatedAt/createdAt, batch delete
  cascades assignments.
- `authRepo.test.ts` — sign-in resolves family, sign-out clears groupId.

### 3. State / hook tests (new)
`@testing-library/react` + `renderHook`:
- `useAuth` — happy path + unauthorized email.
- `useGroupData` — listeners translate snapshots to state.
- `useLocalConfig` — localStorage round-trip.

### 4. Screen smoke tests (new, thin)
Render each screen with fake providers, assert critical affordances exist:
- Dashboard empty state.
- RidesBoard filter chips.
- EventEditor required-field error.
- ActivityEditor saves + cascades.

Do NOT aim for pixel-level or full interaction coverage here — we rely on
manual QA + real devices for UI bugs.

## Coverage target
- Domain: ≥ 90%.
- Repos + hooks: ≥ 70%.
- Screens: smoke-only.
- No target for `firebase.ts`, `registerSW.ts`, `familiesData.ts` (generated).

## No E2E framework this round
Playwright would buy us install + Firebase emulator overhead that doesn't
pay off for a single family today. Add later when the user-base grows.

## CI scope
`npm test && npm run typecheck` on every PR. That's it.
