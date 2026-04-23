# CLAUDE.md — Context pack for Claude Code sessions

Read this first. It is the shortest path from zero context to productive work.

---

## 1. What this project is

**Kids Rides & Classes Manager** — a Progressive Web App (PWA) for parent
groups to coordinate children's classes and shared rides.

- Stack: **React 18 + TypeScript + Vite + Vitest + Firebase (Firestore + Auth) +
  SheetJS (xlsx, backup only) + Workbox service worker + React Router**
- Installable on Android (Chrome install prompt) and iOS (Add to Home Screen)
- Offline-capable via Firestore `persistentLocalCache()` (IndexedDB) + Workbox precache
- **All shared data lives in Firebase Firestore**, real-time synced across all
  devices in the same family group
- Auth via Google Sign-In (`signInWithPopup`); membership gated by `families.yaml`

The original Android-native version (Kotlin) was retired 2026-04-18.
A Google Drive/Sheets integration was drafted and then replaced by a local
XLSX approach 2026-04-19, which was then replaced by Firebase Firestore
real-time sync 2026-04-22.

---

## 2. Repo layout

```
/
├── README.md                    ← user-facing entry point
├── CLAUDE.md                    ← THIS file
├── gettingStarted.md            ← developer workflow
├── install.sh                   ← one-shot host setup (Node 20 + npm install)
├── families.yaml                ← admin-managed: family names + member emails
├── firestore.rules              ← Firestore security rules (deployed with firebase-tools)
├── firebase.json                ← Firebase Hosting config (dist/, SPA rewrites)
├── .firebaserc                  ← Firebase project alias (idrive-8bcdc)
├── .env.local                   ← VITE_FIREBASE_* env vars (not committed)
│
├── scripts/
│   └── gen-families.js          ← families.yaml → src/familiesData.ts (run by ./run.sh --firebase)
│
├── package.json / tsconfig.json / vite.config.ts / index.html
│
├── public/
│   ├── favicon.svg
│   └── icons/                   ← icon-192, icon-512, icon-maskable (SVG)
│
├── src/
│   ├── main.tsx                 ← entry
│   ├── App.tsx                  ← router + Shell guard
│   ├── firebase.ts              ← Firebase app init (auth + Firestore with offline cache)
│   ├── familiesData.ts          ← AUTO-GENERATED from families.yaml — do not edit directly
│   ├── styles.css               ← global styles (mobile-first, CSS vars, dark mode)
│   │
│   ├── domain/
│   │   ├── enums.ts             ← all enums as const objects + type unions
│   │   ├── models.ts            ← interfaces + factory helpers (newChild, newEvent, …)
│   │   ├── config.ts            ← AppLocalConfig interface + defaultAppLocalConfig
│   │   ├── recurrence.ts        ← recurrence rule expander
│   │   ├── rideStateMachine.ts  ← assignment state transitions
│   │   └── conflictDetector.ts  ← schedule conflict detection
│   │
│   ├── storage/
│   │   └── xlsxStorage.ts       ← xlsx backup: buildWorkbookBlob, parseWorkbookFromBuffer
│   │                              (no file handles, no IndexedDB — backup export only)
│   │
│   ├── state/
│   │   └── AppContext.tsx        ← React context: auth, Firestore listeners, all mutations
│   │
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TabBar.tsx
│   │   ├── ChildDot.tsx
│   │   └── RideStatusChip.tsx
│   │
│   ├── screens/
│   │   ├── OpenFileScreen.tsx        ← Google Sign-In screen
│   │   ├── DashboardScreen.tsx       ← upcoming events, my rides, open ride counts
│   │   ├── ChildrenScreen.tsx        ← list + inline add
│   │   ├── ChildDetailScreen.tsx     ← edit profile, activities list (clickable rows)
│   │   ├── ActivityEditorScreen.tsx  ← add/edit activity → auto-generates events
│   │   ├── EventsScreen.tsx          ← all events
│   │   ├── EventEditorScreen.tsx     ← add/edit single event
│   │   ├── RidesBoardScreen.tsx      ← claim/unclaim legs, child-colour filter
│   │   ├── MyRidesScreen.tsx         ← my claimed rides
│   │   ├── NotificationsScreen.tsx
│   │   └── SettingsScreen.tsx        ← theme, language, reminders, locations, sign out
│   │
│   ├── pwa/registerSW.ts        ← Workbox service worker registration
│   └── lib/
│       ├── format.ts            ← fmtDateTime, fmtDate
│       ├── i18n.ts              ← day-of-week / "every day" labels
│       └── useInstallPrompt.ts  ← PWA install prompt hook
│
└── tests/
    ├── setup.ts                 ← fake-indexeddb/auto (env compat)
    └── domain/
        ├── recurrence.test.ts        (7 cases)
        ├── rideStateMachine.test.ts  (14 cases)
        └── conflictDetector.test.ts  (7 cases)
```

---

## 3. How to build, test, run

```bash
./install.sh              # one-time: installs Node 20 + npm install

npm run dev               # http://localhost:5173 — Vite HMR (Firebase works on localhost)
npm test                  # Vitest — 28 cases, ~1s
npm run typecheck         # tsc --noEmit
npm run build             # dist/ (includes sw.js + manifest.webmanifest)
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

On first sign-in, `AppContext` uses `findFamily(email)` to look up the family,
creates the Firestore group doc (if it doesn't exist), and registers the parent.
Unauthorized emails get `auth/sign-out` + an error message displayed on screen.

**Never edit `src/familiesData.ts` directly** — it is overwritten on every
`./run.sh --firebase` run.

---

## 6. Core domain concepts

### Activity
A **template** attached to a child. It has no date — it describes a
recurring schedule:
- `name`, `place` — what and where
- `days: string[]` — days of week as `DayOfWeek` values; empty = every day
- `startTime`, `endTime` — `"HH:MM"` strings
- `repeating: boolean` — `true` = recurring (all matching days); `false` = one-time (first matching day only)
- `needsRide: boolean`, `rideDirection: RideDirection` — ride coordination

**Activities are edited in `ActivityEditorScreen`** and stored as a JSON
array on the `Child` document in Firestore. They are never shown in the
Events screen.

### Event
A **concrete dated occurrence** derived from an activity or added manually.
Stored in `groups/{groupId}/events/{eventId}` in Firestore. Key fields:
`eventId`, `childId`, `title`, `eventType`, `startDateTime`, `endDateTime`,
`locationName`, `needsRide`, `rideDirection`, `status`.

### Activity → Event generation
When an activity is saved, `ActivityEditorScreen` calls `generateActivityEvents`:
- Iterates from **today** to **end of current month**
- Skips days not in `activity.days` (unless `days` is empty = every day)
- Stops after first match if `!activity.repeating` (one-time)
- Event IDs are **deterministic**: `act-{childId.slice(-6)}-{slugged-name}-{YYYY-MM-DD}`
  so saving the same activity twice is idempotent (upsert deduplicates)
- Events are bulk-written via `upsertEvents()` (single Firestore batch)

When editing an existing activity, future events with `eventType === existing.name`
are also updated in bulk before regenerating.

### RideAssignment
Stored in `groups/{groupId}/assignments/{assignmentId}`.
Links a `driverParentId` to an `eventId` + `rideLeg` (`TO` / `FROM`).
Status flows: `UNASSIGNED → VOLUNTEERED → CONFIRMED → COMPLETED`.

---

## 7. Data flow

```
Sign in with Google
  → onAuthStateChanged fires with user
  → check localStorage cache for groupId
  → if not cached: findFamily(user.email) → look up in bundled familiesData
  → setDoc group root (merge: safe if it already exists)
  → setDoc parents/{uid} with displayName + email
  → cache groupId in localStorage; setGroupId(groupId)

5 Firestore onSnapshot listeners activate (on groupId change):
  → groupDoc  → sharedConfig (globalLocations, globalActivities)
  → parents   → parents[]
  → children  → children[]
  → events    → events[]
  → assignments → assignments[]

Any mutation (upsertChild, upsertEvent, upsertEvents, upsertAssignment, …)
  → writes to Firestore via setDoc / writeBatch
  → Firestore listener fires on all connected devices within ~1s
  → React state updates automatically
```

No polling, no sync button. Firestore listeners handle everything.

---

## 8. Login / identity

`AppContext` exposes:
- `authUser: User | null` — Firebase Auth user object
- `parent: AppParent | null` — resolved after parents listener fires
- `authError: string | null` — shown on OpenFileScreen for unauthorized emails

`Shell` in `App.tsx` shows `<OpenFileScreen />` when `!authUser || !parent`.

Config is split:
- **Shared** (`globalLocations`, `globalActivities`) — stored in the Firestore
  group doc, visible to all members
- **Local** (theme, language, etc.) — stored in `localStorage` on the device

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
  ...RideAssignment fields + .updatedAt
```

---

## 10. Conventions

- **TypeScript strict mode** — `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch` all on
- **Immutability** — always spread (`{ ...obj, field: v }`), never mutate
- **Enums as `const` objects + `type` union** (not TS `enum`) — serialises
  as plain strings, no runtime gotchas. See `src/domain/enums.ts`.
- **`@` alias → `src/`** — always use `@/domain/…` not `../../domain/…`
- **Never import SheetJS outside `xlsxStorage.ts`**
- **Never import Firebase outside `src/firebase.ts` and `src/state/AppContext.tsx`**
- **One screen per file** under `src/screens/`; **one component per file**
  under `src/components/`
- **Bulk mutations** — when saving multiple events at once use `upsertEvents`
  (single `writeBatch`), not `Promise.all(array.map(upsertEvent))`

---

## 11. State of implementation

### ✅ Done
- PWA scaffold: manifest, icons, Workbox service worker (auto-update,
  network-first for HTML, cache-first for images, stale-while-revalidate
  for JS/CSS)
- Firebase Auth: Google Sign-In via popup
- Firestore real-time sync with offline persistence (`persistentLocalCache`)
- `families.yaml` membership management (no group codes, no invite flow)
- Firebase Hosting deployment at `idrive-8bcdc.web.app`
- 12 screens (including ActivityEditor)
- Activity model: per-child, days/time/place/needsRide, recurring or one-time
- Activity → Event auto-generation (today → end of month, deterministic IDs)
- Rides Board: child-colour filter tabs + background tint when filtered
- Dashboard: week and month open-ride-request counters
- Recurrence expander, ride state machine, conflict detector (28 tests, all green)
- Local config in localStorage; shared config in Firestore group doc
- xlsx backup download (Settings → Download backup)

### 🚧 Known gaps
- No conflict-resolution UI (detector exists in `conflictDetector.ts`)
- `CommonActivityEditorScreen.tsx` exists in the file system but has no
  route — dead code, can be deleted

### ❌ Not started
- Web Push notifications
- Hebrew localisation

---

## 12. Things that will bite you

- **`auth/unauthorized-domain`** — the Firebase Auth authorized-domain list
  must include any origin you sign in from. `localhost` and
  `idrive-8bcdc.web.app` are already listed. Cloudflare tunnel URLs change
  each run — use `./run.sh --firebase` for a stable URL instead.
- **`signInWithPopup` vs redirect** — redirect requires sessionStorage, which
  is blocked by self-signed certs on localhost. Always use popup.
- **`families.yaml` is embedded at build time** — adding a member requires
  re-deploy. The user will get an "unauthorised" error until the new bundle
  is live.
- **Firestore `isMember` rule does a `get()`** — this counts as a read
  operation. Safe for small groups; at very large scale would hit read limits.
- **Bulk vs single upsert** — use `upsertEvents(array)` for multi-event
  writes. Individual `Promise.all` calls are safe with Firestore (no stale
  closure issue), but `writeBatch` is more efficient and atomic.
- **`familiesData.ts` is auto-generated** — `./run.sh --firebase` overwrites
  it. Don't manually edit or commit changes to it.
- **Activity IDs are deterministic** — `act-{childId.slice(-6)}-{slug}-{date}`.
  Re-saving an activity does NOT duplicate events; it upserts them.

---

## 13. Quick sanity check

```bash
npm test          # expect: 28 passed, 0 failed, ~1s
npm run typecheck # expect: no errors
npm run build     # expect: ✓ built, dist/sw.js generated
```

---

## 14. Rules of thumb

1. **Edit `src/`, test with `tests/`.** No fixtures in `src/`.
2. **New screen → register in `App.tsx` + maybe `TabBar.tsx`.** Sub-routes
   (e.g. `/events/:id`) should NOT appear in the tab bar.
3. **All Firestore mutations go in `AppContext.tsx`.** Keep screens free of
   direct Firebase imports.
4. **All xlsx logic stays in `xlsxStorage.ts`.** It is backup-only — no
   reads used for app state.
5. **Never commit `dist/`, `dev-dist/`, `node_modules/`, `.env.local`, `*.xlsx` data files.**
6. **To add a family member: edit `families.yaml` → `./run.sh --firebase`.**
   No code changes required.
