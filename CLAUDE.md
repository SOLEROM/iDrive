# CLAUDE.md — Context pack for Claude Code sessions

Read this first. It is the shortest path from zero context to productive work.

---

## 1. What this project is

**Kids Rides & Classes Manager** — a Progressive Web App (PWA) for parent
groups to coordinate children's classes and shared rides.

- Stack: **React 18 + TypeScript + Vite + Vitest + Firebase (Firestore + Auth) +
  SheetJS (xlsx, export only) + Workbox service worker + React Router**
- Installable on Android (Chrome install prompt) and iOS (Add to Home Screen)
- Offline-capable via Firestore `persistentLocalCache()` (IndexedDB) + Workbox precache
- **All shared data lives in Firebase Firestore**, real-time synced across all
  devices in the same family group
- Auth via Google Sign-In (`signInWithPopup`); membership gated by `families.yaml`

History: original Android-native version (Kotlin) retired 2026-04-18.
A Google Drive/Sheets integration was drafted then replaced by a local XLSX
approach 2026-04-19, then replaced by Firebase Firestore real-time sync
2026-04-22. The full layered rewrite (`design/`) landed 2026-04-25.
Subsequent product work through 2026-04-27 added: calendar-style Day view,
Today/7d filter on the dashboard, prev/next nav on Day/Week/Month, external
"Other…" driver assignment (red, visible to everyone), Hebrew UI string
bag, members-list refresh on deploy, "fully covered" ✓ badge on day-view
boxes, two-step delete-child cascade, generate / reset-current-month flow.

---

## 2. Repo layout

```
/
├── README.md                    ← user-facing entry point
├── CLAUDE.md                    ← THIS file
├── gettingStarted.md            ← developer workflow
├── install.sh                   ← one-shot host setup (Node 20 + npm install)
├── families.yaml                ← admin-managed: family names + member emails
├── firestore.rules              ← Firestore security rules (deployed via firebase-tools)
├── firebase.json                ← Firebase Hosting config (dist/, SPA rewrites)
├── .firebaserc                  ← Firebase project alias (idrive-8bcdc)
├── .env.local                   ← VITE_FIREBASE_* env vars (not committed)
│
├── design/                      ← architecture / planning notes (drives the rewrite)
│   ├── README.md, 00…19.md, pitfalls.md, IMPLEMENTATION_STATUS.md
│
├── scripts/
│   ├── gen-families.js          ← families.yaml → src/familiesData.ts
│   ├── sync-families.js         ← unused alt admin SDK path (kept for reference)
│   └── generate-icons.mjs
│
├── package.json / tsconfig.json / vite.config.ts / index.html
│
├── public/
│   ├── favicon.svg
│   └── icons/                   ← icon-192, icon-512, icon-maskable
│
├── src/
│   ├── main.tsx                 ← entry
│   ├── App.tsx                  ← router + Shell guard + LandingRedirector
│   ├── familiesData.ts          ← AUTO-GENERATED from families.yaml — do not edit
│   ├── styles.css               ← global styles (mobile-first, CSS vars, dark mode)
│   │
│   ├── domain/                  ← pure TS, zero side effects, 100% testable
│   │   ├── enums.ts             ← all enums as const objects + type unions
│   │   ├── models.ts            ← Child / Event / RideAssignment / Activity
│   │   ├── config.ts            ← LocalConfig + AppLocalConfig
│   │   ├── ids.ts               ← deterministic + random id builders
│   │   ├── timeWindow.ts        ← startOfDay / endOfMonth / dowOf / isoDateLocal
│   │   ├── activityExpander.ts  ← Activity template → Event[] (used by every regen path)
│   │   ├── rollingWindow.ts     ← planActivityRegen (rolling on app open)
│   │   ├── recurrence.ts        ← optional manual-event recurrence rule expander
│   │   ├── rideStateMachine.ts  ← assignment state transitions (single source of truth)
│   │   └── conflictDetector.ts  ← schedule conflict detection
│   │
│   ├── data/                    ← ONLY layer that imports firebase / xlsx
│   │   ├── firebase.ts          ← Firebase app init (auth + Firestore w/ persistent cache)
│   │   ├── paths.ts             ← groupDoc / subCol / subDoc helpers
│   │   ├── familiesBundle.ts    ← reads bundled families[] (findFamily)
│   │   ├── authRepo.ts          ← listenAuth / signInWithGoogle / signOut
│   │   ├── groupRepo.ts         ← ensureGroupDoc / patchSharedConfig / listenSharedConfig
│   │   ├── parentsRepo.ts       ← registerParent / listenParents
│   │   ├── childrenRepo.ts      ← upsertChild / deleteChild / listenChildren
│   │   ├── eventsRepo.ts        ← upsertEvent(s) / deleteEvent(s)Cascade / listenEvents
│   │   ├── assignmentsRepo.ts   ← upsertAssignment / listenAssignments (strips undefineds)
│   │   └── xlsxExporter.ts      ← buildBackupBlob + buildAnalyticsBlob (lazy-imported)
│   │
│   ├── state/                   ← thin React glue over the data layer
│   │   ├── AppContext.tsx       ← composer (auth + group data + local config + theme + regen)
│   │   ├── useAuth.ts           ← onAuthStateChanged → groupId resolution
│   │   ├── useGroupData.ts      ← five Firestore listeners → memoised state
│   │   ├── useLocalConfig.ts    ← localStorage-backed device prefs
│   │   ├── useTheme.ts          ← writes data-theme on <html>
│   │   └── useRollingRegen.ts   ← planRegenAllActivities on app open
│   │
│   ├── components/
│   │   ├── Header.tsx           ← title + optional `right` slot (used by Dashboard for date)
│   │   ├── TabBar.tsx
│   │   ├── ChildDot.tsx
│   │   ├── ChildBadge.tsx       ← coloured pill with the child name (name+colour everywhere)
│   │   ├── MemberPicker.tsx     ← popover: members + "Other…" external driver entry
│   │   ├── RideStatusChip.tsx
│   │   └── UpdateBanner.tsx     ← service-worker "Reload" / "Later"
│   │
│   ├── screens/
│   │   ├── OpenFileScreen.tsx        ← Google Sign-In screen
│   │   ├── DashboardScreen.tsx       ← My rides (top, incl. external red), Upcoming (Today/7d), counts; weekday+date in header right
│   │   ├── ChildrenScreen.tsx        ← list + inline add
│   │   ├── ChildDetailScreen.tsx     ← profile, activities, generate ahead / reset & regen, delete
│   │   ├── ActivityEditorScreen.tsx  ← per-day times, cascades + regenerates
│   │   ├── EventsScreen.tsx          ← Day (calendar timeline) · Week · Month, prev/next nav
│   │   ├── EventEditorScreen.tsx     ← add/edit single event (datetime-local + datalist)
│   │   ├── RidesBoardScreen.tsx      ← future-only, sorted by date, Accept/Release/Done/Undo, member picker incl. "Other…"
│   │   ├── MyRidesScreen.tsx         ← driver OR claimer view + external rides (red)
│   │   ├── NotificationsScreen.tsx   ← stub (notifications scaffold dropped, see design)
│   │   └── SettingsScreen.tsx        ← profile/members(roster live)/appearance/reminders/locations/export/sign-out
│   │
│   ├── pwa/registerSW.ts        ← Workbox SW + onUpdateAvailable bus
│   └── lib/
│       ├── format.ts            ← fmtDateTime/fmtDate/fmtTime — all take optional `language`
│       ├── i18n.ts              ← localeFor(lang) + day-of-week labels + UI string bag t(key, lang)
│       └── useInstallPrompt.ts  ← captures `beforeinstallprompt`
│
└── tests/
    ├── setup.ts                 ← fake-indexeddb/auto (env compat)
    ├── data/
    │   └── xlsxExporter.test.ts        (3)
    └── domain/
        ├── ids.test.ts                  (9)
        ├── timeWindow.test.ts           (6)
        ├── activityExpander.test.ts     (6)
        ├── recurrence.test.ts           (7)
        ├── rideStateMachine.test.ts     (13)
        ├── rollingWindow.test.ts        (3)
        └── conflictDetector.test.ts     (7)
```

Total: **54 tests**, ~1s.

---

## 3. How to build, test, run

```bash
./install.sh              # one-time: installs Node 20 + npm install

npm run dev               # http://localhost:5173 — Vite HMR (Firebase works on localhost)
npm test                  # Vitest — 54 cases, ~1s
npm run typecheck         # tsc --noEmit
npm run build             # dist/ (xlsxExporter is code-split → loaded on tap)
npm run preview           # http://localhost:4173 — serve built dist/

./run.sh --firebase       # gen-families → build → deploy to Firebase Hosting
./run.sh --cloud          # build + Cloudflare quick tunnel (temp public HTTPS URL)
./run.sh --prod           # build + HTTPS preview on :4173 (self-signed cert)
```

**Firebase Hosting (`idrive-8bcdc.web.app`) is the recommended deployment.**
It has a permanent URL, pre-authorized in Firebase Auth, no cert issues.

---

## 4. Firebase setup (one-time, already done for this project)

The project uses Firebase project `idrive-8bcdc`. Config lives in `.env.local`
(not committed). To recreate `.env.local`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=idrive-8bcdc.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=idrive-8bcdc
VITE_FIREBASE_STORAGE_BUCKET=idrive-8bcdc.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

`data/firebase.ts` asserts the required vars at module load and throws a
clear error if any are missing.

`localhost` is listed as an authorized domain in Firebase Console → Auth →
Authorized Domains, so `npm run dev` works without a tunnel.

---

## 5. families.yaml — membership management

`families.yaml` is the single source of truth for which Google accounts can
sign in. The admin edits it and runs `./run.sh --firebase` to deploy.

```yaml
families:
  - name: solovs
    members:
      - parent1@gmail.com
      - parent2@gmail.com
```

`scripts/gen-families.js` converts this into `src/familiesData.ts` (bundled
by Vite). Each family gets a **deterministic groupId** — SHA256 of the
lower-cased family name, first 10 hex chars. The same family name always
produces the same groupId across deploys.

On first sign-in, `useAuth` (via `data/familiesBundle.ts.findFamily(email)`)
looks up the family, creates the Firestore group doc if it doesn't exist,
and registers the parent. Unauthorized emails get `auth/sign-out` + an
error message displayed on screen.

**Never edit `src/familiesData.ts` directly** — it is overwritten on every
`./run.sh --firebase` run.

---

## 6. Core domain concepts

### Activity
A **template** attached to a child. It has no date — it describes a
recurring schedule:
- `name`, `place`, `notes`
- `dayTimes: Record<DayOfWeek, { startTime, endTime }>` — per-day times
- `repeating: boolean` — `true` = recurring; `false` = one-time
- `needsRide: boolean`, `rideDirection: TO|FROM|BOTH`

Stored as a JSON array on the `Child` document. Edited only in
`ActivityEditorScreen`.

### Event
A **concrete dated occurrence** derived from an activity or added manually.
Stored in `groups/{groupId}/events/{eventId}`. Key fields:
`eventId`, `childId`, `title`, `eventType`, `startDateTime`, `endDateTime`,
`locationName`, `needsRide`, `rideDirection`, `status`.

### Activity → Event generation
Implemented in `domain/activityExpander.ts::expandActivity`:

- Iterates the requested window (default: today → end of next month).
- Skips days not in `Object.keys(activity.dayTimes)`; empty = every day.
- Stops after first match if `!activity.repeating`.
- Event IDs are deterministic:
  `act-{childId.slice(-6)}-{slug(name)}-{YYYY-MM-DD}-{HHMM}`.
  The `HHMM` suffix disambiguates two activities with the same name on
  the same day at different times.
- Bulk-written via `eventsRepo.upsertEvents` (single Firestore batch).

When editing, future events with `eventType === existing.name` are
deleted before regeneration (covers rename, day-set change, time change).

### Rolling regeneration on app open
`useRollingRegen` runs once per session. For each (active child × activity)
it consults `planActivityRegen`:
- Find existing future events by `(childId, eventType=activity.name)`.
- If the latest is ≥ 7 days out, do nothing.
- Otherwise expand the activity to end-of-next-month and upsert any
  fingerprint-`(date, startTime)` not already present. Keeps the calendar
  permanently full without manual intervention.

Past events are never modified by any regen path.

### Manual extend: Generate / Reset & regenerate
Card on `ChildDetailScreen` lets the user pick a target month (current +
12 months ahead).

- **Future month** → additive: window `[today, endOfMonth(target)]`,
  upserts only events not already present (by `(eventType, date, startTime)`
  fingerprint).
- **Current month** → "Reset & regenerate" (destructive, confirmation
  required): deletes all events for this child where
  `startDateTime >= today && <= endOfMonth`, then expands every activity
  in the same window. Past events still untouched.

### RideAssignment
Stored in `groups/{groupId}/assignments/{assignmentId}`.
Links a `driverParentId` to an `eventId` + `rideLeg` (`TO` / `FROM`).

Schema additions vs. the original spec:
- `claimedByParentId` — who pressed Assign. Equals `driverParentId` on
  self-claim. Lets a parent assign a leg to another family member.
- `driverParentId === EXTERNAL_DRIVER_ID` ("external") marks an assignment
  to a non-member driver. The typed name lives in `driverName`. External
  rides are visible to **every** family member on Dashboard and My Rides,
  with a red wash + red **External driver** chip.

State flow (current):
```
UNASSIGNED ─Accept──▶ VOLUNTEERED ─Done──▶ COMPLETED
     ▲                    │                   │
     │                    └─Release─▶         │
     │                                ◀─Undo──┘
```
No separate Confirm step — claim goes straight to VOLUNTEERED.
COMPLETED is **not** terminal: Undo done → VOLUNTEERED.
`CONFIRMED` is retained in the enum and rules for legacy rows; new writes
never produce it.

UI gate: the **Done** button is shown only when
`event.startDateTime <= endOfDay(today)`, preventing accidental marking
of future events. Release works regardless of date.

### Day view (calendar timeline)
`EventsScreen` defaults to the Day view: 24 hours × 56 px in a relative
container, hour labels in a 52 px gutter, events as absolutely-positioned
coloured boxes (background = child colour, white text, dark text on
yellow). `layoutEvents()` is a Google-Calendar-style sweep that sorts by
start time and packs transitively-overlapping events into equal-width
columns within each cluster. Today's row gets a red "now" line. Auto-scrolls
`.app-main` to the earliest event (or 7 AM) on day-cursor change. Each
box renders title · time-range · child name · driver names per leg. A
green ✓ badge is rendered top-right when `event.rideDirection === BOTH`
and both TO and FROM legs have an active assignment (round-trip covered).

---

## 7. Data flow

```
Sign in with Google
  → onAuthStateChanged fires with user
  → useAuth checks localStorage cache for groupId
  → if not cached: findFamily(user.email) in bundled families[]
  → ensureGroupDoc + registerParent
  → cache groupId in localStorage; setGroupId(groupId)

5 Firestore onSnapshot listeners activate (on groupId change):
  → groupDoc      → sharedConfig (globalLocations, globalActivities)
  → parents       → parents[]
  → children      → children[]
  → events        → events[]
  → assignments   → assignments[]

useRollingRegen plans + upserts any rolling-window events that lapsed.

Any mutation (upsertChild, upsertEvent(s), upsertAssignment, …)
  → routed through src/data/*Repo.ts
  → setDoc / writeBatch under the hood
  → Firestore listener fires on all connected devices within ~1s
  → React state updates automatically
```

No polling, no sync button. Firestore listeners handle everything.

---

## 8. Login / identity

`useApp()` exposes:
- `authUser: User | null` — Firebase Auth user object (resolved by `useAuth`)
- `parent: AppParent | null` — resolved after parents listener fires
- `authError: string | null` — shown on OpenFileScreen for unauthorized emails

`Shell` in `App.tsx` shows `<OpenFileScreen />` when `!authUser || !parent`.
After sign-in `LandingRedirector` navigates to `config.defaultLandingScreen`.

Config is split:
- **Shared** (`globalLocations`, `globalActivities`) — stored in the Firestore
  group doc, visible to all members
- **Local** (theme, language, defaultLandingScreen, reminder prefs, …) —
  stored in `localStorage` on the device

`bundleMembers: string[]` is also exposed on the context — the lower-cased
list from the embedded `families.yaml` for the active user's family. The
Settings → Members card renders rows from this list (joined to
`parents/{uid}` for displayName) so removed members vanish immediately and
new members appear with a "not signed in yet" tag.

---

## 9. Firestore structure

```
groups/{groupId}
  .groupName: string
  .members: string[]         ← lower-cased emails (used by security rules)
  .globalLocations: string[]
  .globalActivities: Activity[]

groups/{groupId}/parents/{uid}
  .displayName: string
  .email: string

groups/{groupId}/children/{childId}
  ...Child fields + .updatedAt

groups/{groupId}/events/{eventId}
  ...Event fields + .updatedAt + .createdAt

groups/{groupId}/assignments/{assignmentId}
  ...RideAssignment fields + .claimedByParentId? + .updatedAt
```

`firestore.rules` enforces:
- `members[]` can be rewritten on `update`, but **only if the writer's own
  email is in the new list**. So a deploy of `families.yaml` (running as a
  current member) refreshes the roster, while no individual member can
  blank the array and lock everyone out.
- Per-status `validTransition()` table mirrors `domain/rideStateMachine.ts`;
  the loser of an offline race on `UNASSIGNED → VOLUNTEERED` is rejected.
- Parents can only write their own `parents/{uid}` doc.

---

## 10. Conventions

- **TypeScript strict mode** — `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch` all on
- **Immutability** — always spread (`{ ...obj, field: v }`), never mutate
- **Enums as `const` objects + `type` union** (not TS `enum`) — serialises
  as plain strings, no runtime gotchas. See `src/domain/enums.ts`.
- **`@` alias → `src/`** — always use `@/domain/…` not `../../domain/…`
- **Layering**: `ui (screens/components) → state → data → domain`. Never
  the other direction. Only `src/data/` may import `firebase/*` or `xlsx`.
- **`xlsxExporter` is dynamically imported** from the Settings handler so
  the main bundle stays small.
- **One screen per file** under `src/screens/`; **one component per file**
  under `src/components/`
- **Bulk mutations** — use `upsertEvents(array)` (single `writeBatch`),
  not `Promise.all(array.map(upsertEvent))`.
- **No undefined values in repo writes** — `assignmentsRepo.upsertAssignment`
  strips them; if you add a new repo method that touches Firestore, do the
  same (the SDK rejects `undefined`).

---

## 11. State of implementation

### ✅ Done (rewrite landed 2026-04-25, product work through 2026-04-27)
- Layered architecture: `domain · data · state · ui`. Provider is a
  ~150-line composer; `firebase` imports stay inside `data/`.
- PWA scaffold: manifest, icons, Workbox SW. SW update banner (Reload / Later).
- Firebase Auth: Google Sign-In via popup + `useAuth` hook (no fast-path
  cache so `families.yaml` refreshes propagate on next sign-in).
- Firestore real-time sync with offline persistence (`persistentLocalCache`).
- `families.yaml` membership management; deterministic groupId; rules let
  the deploy pipeline refresh `members[]` without locking out the group.
- Settings → Members renders the roster live (incl. emails not yet signed in).
- 12 screens, all using `ChildBadge` (name + colour mandatory everywhere
  an event / ride / activity is shown).
- Activity model with `dayTimes`; expansion in `domain/activityExpander.ts`.
  Event IDs include `-HHMM` so two same-name activities at different times
  do not collide; rolling regen and additive generate dedup by
  `(eventType, date, startTime)` fingerprint to handle legacy IDs.
- Rolling regeneration on app open (top-3 pitfall fix).
- Generate-future-events (additive) + Reset & regenerate (destructive,
  current month, today onward, double-confirm) on the child screen.
- Delete child with double-confirm cascade (events + assignments).
- Rides Board: today-onward only, sorted by date, child-colour filter
  chips, member picker (incl. "Other…" → typed external driver),
  override-confirm modal, red wash for external rides.
- External drivers: assignments with `driverParentId === "external"` are
  visible to **every** member on Dashboard and My Rides with a red wash +
  **External driver** chip + typed driver name.
- Ride state machine: claim straight to VOLUNTEERED, no Confirm step;
  Done is today-or-past only; Undo done available; Release any time.
- Dashboard: weekday + date on the right of the header; My rides on top
  (incl. external red cards) → Upcoming (Today / 7 days, default Today)
  → Week / Month leg counts; ride-Done button on My-rides cards.
- Events screen: **Day (calendar timeline)** · Week · Month, prev/next
  navigation on each, default Day. One dot per event in month cells (no
  dedup, no cap); local-time `?date=` parameter on quick-add links;
  fully-covered ✓ badge on day-view boxes when both TO and FROM are
  assigned for round-trip events.
- Settings: profile, members, appearance, reminders, locations,
  **Download backup** + **Export for analysis** (analytics workbook with
  flat `Events`/`Assignments`/`Activities`/`Summary` sheets).
- Hebrew language switch (Settings → Language) flips:
  - Weekday + date strings via `Intl.DateTimeFormat` (locale `"he"`).
  - Activity day chips (`getDayOfWeekLabel`).
  - Dashboard section titles, filter pills, empty states, button labels
    via `t(key, language)` UI string bag in `lib/i18n.ts`.
  - Event view mode chips (Day/Week/Month).
- Recurrence expander, ride state machine, conflict detector, activity
  expander, rolling window, ids, timeWindow — 54 Vitest cases, all green.
- Firestore rules hardened: per-status `validTransition`, members[]
  guarded, offline-race protection on claim.

### 🚧 Known gaps (deliberately deferred)
- No conflict-resolution UI (detector exists in `conflictDetector.ts`).
- Notifications scaffolding intentionally not shipped (pitfall #24).
- Full Hebrew UI translation: dates, weekday chips, mode pills and
  Dashboard chrome are translated; many in-screen strings (RidesBoard
  buttons, ChildDetail labels, EventEditor fields) are still English.

### ❌ Not started
- Web Push / FCM

---

## 12. Things that will bite you

- **`auth/unauthorized-domain`** — Firebase Auth authorized-domain list
  must include any origin you sign in from. `localhost` and
  `idrive-8bcdc.web.app` are pre-listed. Cloudflare tunnel URLs change
  each run — use `./run.sh --firebase` for a stable URL instead.
- **`signInWithPopup` vs redirect** — redirect requires sessionStorage,
  blocked by self-signed certs on localhost. Always use popup.
- **`families.yaml` is embedded at build time** — adding a member requires
  re-deploy. The user will get an "unauthorised" error until the new
  bundle is live.
- **Firestore `isMember` rule does a `get()`** — counts as a read. Safe
  for small groups; ugly per GB at scale.
- **Use `eventsRepo.upsertEvents(array)` for bulk writes** — single
  `writeBatch`, atomic.
- **`familiesData.ts` is auto-generated** — `./run.sh --firebase` overwrites
  it. Don't manually edit or commit changes to it.
- **Activity event IDs include the start time** — `act-{childId6}-{slug}-{YYYY-MM-DD}-{HHMM}`.
  Two same-name activities at different times no longer collide. Legacy
  events without the `HHMM` suffix still work; the regen layer dedups by
  `(date, startTime)` fingerprint so they aren't duplicated.
- **Past events are immutable from the regen paths** — neither the
  rolling-regen nor the manual Generate / Reset & regenerate buttons
  ever touch events whose `startDateTime < todayStart()`.
- **`undefined` in Firestore writes throws** — `assignmentsRepo` strips
  them defensively; do the same in any new repo you write.
- **`xlsx` is code-split** — first tap on Download backup / Export for
  analysis loads the chunk; subsequent taps are instant.
- **External rides are visible to everyone** — `driverParentId ===
  "external"` (sentinel `EXTERNAL_DRIVER_ID`). Dashboard's "My rides" and
  MyRidesScreen both include them; do **not** filter them out when adding
  new dashboards or counters unless you mean to hide them.
- **Day-view auto-scroll** — `DayView` queries `.app-main` and scrolls it
  to the earliest event on day-cursor change. If you change the layout and
  drop the `app-main` class, day-view will silently stop auto-scrolling.
- **Header `right` slot** — when `action` is set, `right` is ignored.
- **Hebrew locale on iOS** — confirmed working via `Intl`; if you ever see
  mixed-language output it's almost always the PWA service-worker cache —
  tap the **Reload** banner after a deploy.

---

## 13. Quick sanity check

```bash
npm test          # expect: 54 passed, 0 failed, ~1s
npm run typecheck # expect: no errors
npm run build     # expect: ✓ built, dist/sw.js generated, xlsxExporter chunk split
```

---

## 14. Rules of thumb

1. **Edit `src/`, test with `tests/`.** No fixtures in `src/`.
2. **New screen → register in `App.tsx` + maybe `TabBar.tsx`.** Sub-routes
   should NOT appear in the tab bar.
3. **Layering** — screens call `useApp()`. Provider calls repos. Repos
   call Firestore. Domain calls nothing.
4. **All xlsx logic stays in `data/xlsxExporter.ts`** (lazy-imported).
5. **Never commit** `dist/`, `dev-dist/`, `node_modules/`, `.env.local`,
   `*.xlsx` data files, or `serviceAccount.json`.
6. **To add a family member: edit `families.yaml` → `./run.sh --firebase`.**
   No code changes required.
7. **Plans are intent. Code is current state.** When the two diverge,
   trust the code and update the planning docs in `design/`.
8. **For Hebrew strings** — add to `STRINGS` in `lib/i18n.ts` and call
   `t(key, config.language)` from the screen. Storage stays English.
9. **For locale-aware dates** — pass `config.language` to `fmtDateTime` /
   `fmtDate` / `fmtTime`, or call `localeFor(language)` and feed it to
   `Intl.*` directly.
