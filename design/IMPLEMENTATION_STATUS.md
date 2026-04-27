# Implementation Status (rewrite landed 2026-04-25 · last updated 2026-04-27)

The design folder holds intent; this file tracks what actually shipped and
where the code diverges from earlier docs.

## Phases

| Phase | Topic | Status |
|---|---|---|
| 1 | Scaffolding (`src/data/`, `src/state/`, dead-code purge) | ✅ |
| 2 | Domain cleanup (ids, timeWindow, activityExpander, model trims) | ✅ |
| 3 | Repo layer (per-collection repos, layering enforced) | ✅ |
| 4 | UI cleanup (ChildBadge everywhere, ride flow, landing redirect) | ✅ |
| 5 | Polish (analytics export, SW update banner, code-split xlsx) | ✅ |
| 6 | Pitfall fixes (top-3) | ✅ |

## Pitfalls addressed

- **#1 Offline race on ride claims** — `firestore.rules` ships a per-status
  `validTransition()` table; the loser of `UNASSIGNED → VOLUNTEERED` is
  rejected by the rule rather than silently overwriting the winner.
- **#19 Event window never advances** — `domain/rollingWindow.ts` +
  `state/useRollingRegen.ts` regenerate the window on app open whenever the
  latest future event is < 7 days out.
- **#24 Drop the notifications scaffold** — no notification docs, no scaffold
  schema. Notifications screen is a stub.

## Product changes that arrived after the original design

- **Assign-to-other-member**: split Accept control + `MemberPicker` popover.
  New field `RideAssignment.claimedByParentId`. MyRides shows "Assigned by …"
  pill. The override-confirm modal handles takeovers.
- **Drop the Confirm step**: claim goes UNASSIGNED → VOLUNTEERED (no
  CONFIRMED). `CONFIRMED` is retained in the enum + rules for legacy rows.
- **COMPLETED is no longer terminal**: Undo done → VOLUNTEERED. Same applies
  to legacy CONFIRMED.
- **Same-day-only Done**: gating in RidesBoard, MyRides, Dashboard. Release
  always available.
- **Past events are immutable** from any regen path. Generate / Reset &
  regenerate / rolling regen all clamp `windowStart` to `todayStart()`.
- **Generate-ahead UI**: month-picker (1..12 months ahead) on the child
  screen. Selecting current month switches to **Reset & regenerate** with a
  confirmation modal — destructive, deletes events from today through end of
  month for that child, then expands all activities afresh.
- **Delete child** with double-confirm cascade — events + assignments wiped.
- **Dashboard reorder** — My rides on top; Upcoming events with Today / 7
  days pills (default Today); ride-Done button on My-rides cards
  (same-day-only).
- **Events screen navigation** — prev/next month and prev/next week.
- **Month cells** — one dot per event, no dedup, no cap, wrapping row.
- **Rides Board** — today-onward only, sorted by start date.
- **Settings export** — second xlsx button "Export for analysis" producing
  a flat workbook (Events / Assignments / Activities / Summary). xlsx code
  is split into its own chunk and lazy-imported.
- **SW update banner** — "Reload" / "Later" instead of console.info only.

## Bugs fixed during execution

- **Same-name same-day collision**: deterministic event ID now includes
  `-HHMM`. Regen dedup uses `(date, startTime)` fingerprint so legacy rows
  are recognised and not duplicated. Tests cover the case.
- **Release silently no-op**: `claimedByParentId: undefined` rejected by
  Firestore SDK. `assignmentsRepo` strips undefined values defensively.
- **Day-off-by-one for clicked date**: `EventsScreen` now passes
  `isoDateLocal(dayMs)` instead of `toISOString().slice(0,10)`.
- **`CONFIRMED → UNASSIGNED` rejected by rules**: rules table mirrors the
  state machine; release works from any active state.
- **Upcoming-events Done archived events** → button removed; the EventsScreen
  no longer filters by ARCHIVED, so any pre-fix archived events come back.
- **Landing screen `CALENDAR` had no route** → enum option dropped;
  `landingScreenPath()` resolves the rest.

## Product additions through 2026-04-27

- **Calendar-style Day view** in `EventsScreen` — 24-hour timeline with
  hour gutter, child-coloured event boxes, overlap-aware column packing
  (`layoutEvents`), red "now" line on today, auto-scroll to earliest
  event, fully-covered ✓ badge when both TO and FROM legs are claimed.
  Default view; mode order is **Day · Week · Month**.
- **External driver ("Other…")** — sentinel `EXTERNAL_DRIVER_ID` lets a
  parent assign a leg to a non-member by typing a name. Red wash and
  **External driver** chip on Rides Board, MyRides and Dashboard. Visible
  to every family member regardless of who recorded it.
- **Hebrew language** — `localeFor(language)` helper, `t(key, language)`
  UI string bag in `lib/i18n.ts`. `fmt*` accept a `language` arg; every
  weekday / month / mode-chip string flips to Hebrew when Settings →
  Language is HEBREW. Stored data stays English.
- **Members roster refresh** — `firestore.rules` lets a current member
  rewrite `members[]` if their own email remains in the new list, so a
  `./run.sh --firebase` redeploy propagates the latest `families.yaml` on
  the next sign-in. `useAuth` no longer caches the slow path so this
  always runs. Settings → Members renders from the bundled roster (joined
  to `parents/{uid}` for displayName), with a "not signed in yet" tag.
- **ChildDetail activity rows** now derive day chips from
  `Object.keys(activity.dayTimes)` when `activity.days[]` is empty, so
  legacy activities show real days (translated) instead of "Every day".
- **Dashboard header** — left: "Hi, {name}" (translated). Right: stacked
  weekday + short date, locale-aware via `Header.right` slot.
- **Ride Done button on Dashboard "My rides"** — same-day-only gating,
  no longer archives the underlying event (the ARCHIVE filter on Events
  was also removed; archived events come back into view).
- **Event view date param fix** — quick-add links use `isoDateLocal()` so
  the editor opens with the correct day for users east of UTC.
- **Same-day same-name activity collision** — event IDs include
  `-HHMM`. Regen layers dedup by `(eventType, date, startTime)`
  fingerprint to handle legacy IDs without duplicating.
- **Generate ahead** UI on `ChildDetailScreen`: pick a target month
  (current + 12 ahead). Future months → additive; current month →
  destructive **Reset & regenerate** with confirmation, today onward
  only. Past events are never touched by any regen path.
- **Delete child** — double-confirm cascade: deletes events + their
  assignments, then the child doc.
- **Rides Board today-onward filter** + chronological sort.
- **Release** allowed from any active state (rule + state-machine
  updated). `claimedByParentId` cleared via empty string (Firestore SDK
  rejects `undefined`; `assignmentsRepo` strips defensively).
- **COMPLETED → VOLUNTEERED** undo (no-longer-terminal).
- **Service-worker update banner** — Reload / Later (was console.info).

## Deliberately deferred

- **Web Push / FCM** and any notifications UI beyond the stub.
- **Full Hebrew localisation** — only day-of-week strings translated.
- **Conflict-resolution UI** — `conflictDetector` exists; no surface yet.
- **`emailIndex` admin-SDK flow** — `families.yaml` bundle still in use;
  `scripts/sync-families.js` retained as reference but not invoked.
- **DST-aware activity expansion** — events stay at "9:00 local" across DST
  by design; documented in `19-known-issues.md`.

## Tests

8 files, **54 cases**, ~1s.

```
tests/
├── data/
│   └── xlsxExporter.test.ts        (3)
└── domain/
    ├── ids.test.ts                  (9)   ← incl. time-suffix disambiguation
    ├── timeWindow.test.ts           (6)
    ├── activityExpander.test.ts     (6)   ← incl. same-name same-day distinct ids
    ├── recurrence.test.ts           (7)
    ├── rideStateMachine.test.ts     (13)  ← updated for new state flow
    ├── rollingWindow.test.ts        (3)
    └── conflictDetector.test.ts     (7)
```
