# CLAUDE.md — Context pack for Claude Code sessions

Read this first. It is the shortest path from zero context to productive work.

---

## 1. What this project is

**Kids Rides & Classes Manager** — a Progressive Web App (PWA) for parent
groups to coordinate children's classes and shared rides.

- Stack: **React 18 + TypeScript + Vite + Vitest + SheetJS (xlsx) +
  Workbox service worker + React Router**
- Installable on Android (Chrome install prompt) and iOS (Add to Home Screen)
- Offline-capable via Workbox service worker precache
- **All data lives in a single local `.xlsx` file** (typically `idrive.xlsx`)
  opened via the browser File System Access API
- No backend, no cloud sync — the user owns the file

The original Android-native version (Kotlin) was retired 2026-04-18. A
Google Drive/Sheets integration was drafted and then replaced by the XLSX
approach 2026-04-19.

---

## 2. Repo layout

```
/
├── README.md                    ← user-facing entry point
├── CLAUDE.md                    ← THIS file
├── gettingStarted.md            ← developer workflow
├── install.sh                   ← one-shot host setup (Node 20 + npm install)
├── plan1.md                     ← original product spec (authoritative for intent)
├── plan2.md                     ← PWA migration brief
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
│   ├── styles.css               ← global styles (mobile-first, CSS vars, dark mode)
│   ├── file-system-access.d.ts  ← TS declarations for showOpenFilePicker / showSaveFilePicker
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
│   │   └── xlsxStorage.ts       ← ALL file I/O: open, create, read, write XLSX
│   │                              also persists FileSystemFileHandle in IndexedDB
│   │
│   ├── state/
│   │   └── AppContext.tsx        ← React context + all mutations (upsertChild, upsertEvent, …)
│   │
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TabBar.tsx
│   │   ├── ChildDot.tsx
│   │   └── RideStatusChip.tsx
│   │
│   ├── screens/
│   │   ├── OpenFileScreen.tsx        ← open existing or create new file
│   │   ├── DashboardScreen.tsx       ← upcoming events, my rides, open ride counts
│   │   ├── ChildrenScreen.tsx        ← list + inline add
│   │   ├── ChildDetailScreen.tsx     ← edit profile, activities list (clickable rows)
│   │   ├── ActivityEditorScreen.tsx  ← add/edit activity → auto-generates events
│   │   ├── EventsScreen.tsx          ← all events
│   │   ├── EventEditorScreen.tsx     ← add/edit single event
│   │   ├── RidesBoardScreen.tsx      ← claim/unclaim legs, child-colour filter
│   │   ├── MyRidesScreen.tsx         ← my claimed rides
│   │   ├── NotificationsScreen.tsx
│   │   └── SettingsScreen.tsx        ← theme, language, reminders, locations, close file
│   │
│   ├── pwa/registerSW.ts        ← Workbox service worker registration
│   └── lib/
│       ├── format.ts            ← fmtDateTime, fmtDate
│       ├── i18n.ts              ← day-of-week / "every day" labels
│       └── useInstallPrompt.ts  ← PWA install prompt hook
│
└── tests/
    ├── setup.ts                 ← fake-indexeddb/auto (env compat, no Dexie in app)
    └── domain/
        ├── recurrence.test.ts        (7 cases)
        ├── rideStateMachine.test.ts  (14 cases)
        └── conflictDetector.test.ts  (7 cases)
```

---

## 3. How to build, test, run

```bash
./install.sh              # one-time: installs Node 20 + npm install

npm run dev               # http://localhost:5173 — Vite HMR
npm test                  # Vitest — 28 cases, ~1s
npm run typecheck         # tsc --noEmit
npm run build             # dist/ (includes sw.js + manifest.webmanifest)
npm run preview           # http://localhost:4173 — serve built dist/
```

**HTTPS required for LAN / phone access.** `localhost` works on HTTP;
accessing from a phone on LAN requires HTTPS. Use `vite preview --https`
or a tunnel.

---

## 4. XLSX file format

| Tab name | Content |
|---|---|
| `Config` | Key-value config rows, then blank row, then `[Children]` header + one row per child. Child activities are stored as a JSON blob in column 6. |
| `MMYY` (e.g. `0426`) | One tab per month. Contains `[Events]` section (header + rows), blank row, then `[Assignments]` section. |

Tab names are produced by `monthTabName(timestamp)` in `xlsxStorage.ts`:
`MM` = zero-padded month, `YY` = two-digit year (e.g. `"0426"` for April 2026).

All reads/writes go through `src/storage/xlsxStorage.ts`. Nothing else
touches SheetJS directly.

---

## 5. Core domain concepts

### Activity
A **template** attached to a child. It has no date — it describes a
recurring schedule:
- `name`, `place` — what and where
- `days: string[]` — days of week as `DayOfWeek` values; empty = every day
- `startTime`, `endTime` — `"HH:MM"` strings
- `repeating: boolean` — `true` = recurring (all matching days); `false` = one-time (first matching day only)
- `needsRide: boolean`, `rideDirection: RideDirection` — ride coordination

**Activities are edited in `ActivityEditorScreen`** and stored as a JSON
array on the `Child` record (in the Config tab). They are never shown in the
Events screen.

### Event
A **concrete dated occurrence** derived from an activity or added manually.
Stored in monthly tabs. Key fields: `eventId`, `childId`, `title`,
`eventType`, `startDateTime`, `endDateTime`, `locationName`, `needsRide`,
`rideDirection`, `status`.

### Activity → Event generation
When an activity is saved, `ActivityEditorScreen` calls `generateActivityEvents`:
- Iterates from **today** to **end of current month**
- Skips days not in `activity.days` (unless `days` is empty = every day)
- Stops after first match if `!activity.repeating` (one-time)
- Event IDs are **deterministic**: `act-{childId.slice(-6)}-{slugged-name}-{YYYY-MM-DD}`
  so saving the same activity twice is idempotent (upsert deduplicates)
- Events are bulk-written via `upsertEvents()` (single file write)

When editing an existing activity, future events with `eventType === existing.name`
are also updated in bulk before regenerating.

### RideAssignment
Links a `driverParentId` to an `eventId` + `rideLeg` (`TO` / `FROM`).
Status flows: `UNASSIGNED → VOLUNTEERED → CONFIRMED → COMPLETED`.

---

## 6. Data flow

```
Open/create file
  → showOpenFilePicker / showSaveFilePicker
  → xlsxStorage: parse XLSX → AppData { config, children, events, assignments }
  → AppContext: dataRef.current = data; setData(data)   ← MUST update both

Any mutation (upsertChild, upsertEvent, upsertEvents, upsertAssignment, …)
  → reads dataRef.current (always the latest data — see §8)
  → builds next AppData
  → save(): dataRef.current = next; setData(next); writeToHandle(handle, next)
```

No sync queue, no debounce. Every mutation writes the full file immediately.

---

## 7. Login / identity

There is **no auth flow**. `AppContext` derives the `parent` object from
`config.loginName` and `config.loginEmail`:

```typescript
const parent = loginName && loginEmail
  ? { parentId: loginEmail, displayName: loginName, email: loginEmail }
  : null;
```

`Shell` in `App.tsx` shows `<OpenFileScreen />` when `parent` is null.
The `parent` object is set:
- **On file create**: the user enters name + email in `OpenFileScreen` → stored in config
- **On file open**: read from the `Config` tab

If a file is opened that has no `loginName`/`loginEmail` (e.g. corrupted),
the app stays on `OpenFileScreen`. The user must create a new file or
manually edit the `.xlsx`.

---

## 8. The `dataRef` pattern — critical

All upsert functions in `AppContext` read `dataRef.current`, NOT React state
(`data`). This is intentional to prevent stale-closure bugs where sequential
or batched mutations each overwrite the file using an outdated snapshot.

```typescript
// In AppContext.tsx
const dataRef = useRef(data);
dataRef.current = data;         // sync on every render — always current
```

Additionally, every call path that calls `setData(x)` directly (openFile,
createFile, closeFile, tryReopenSavedFile) must also do `dataRef.current = x`
**before** calling `setData`. This ensures the ref is current even before
the first React re-render after opening a file.

`save()` also updates the ref synchronously:
```typescript
const save = async (handle, next) => {
  dataRef.current = next;
  setData(next);
  await writeToHandle(handle, next);
};
```

**Never add a mutation that reads `data` (React state) directly** — it will
be stale inside async functions. Always use `dataRef.current`.

---

## 9. Conventions

- **TypeScript strict mode** — `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch` all on
- **Immutability** — always spread (`{ ...obj, field: v }`), never mutate
- **Enums as `const` objects + `type` union** (not TS `enum`) — serialises
  as plain strings, no runtime gotchas. See `src/domain/enums.ts`.
- **`@` alias → `src/`** — always use `@/domain/…` not `../../domain/…`
- **Never import SheetJS outside `xlsxStorage.ts`**
- **No Dexie anywhere** — `xlsxStorage.ts` uses raw `indexedDB.open` only to
  persist the `FileSystemFileHandle`. `tests/setup.ts` imports
  `fake-indexeddb/auto` for environment compat only.
- **One screen per file** under `src/screens/`; **one component per file**
  under `src/components/`
- **Bulk mutations** — when saving multiple events at once use `upsertEvents`
  (not a `Promise.all` of individual `upsertEvent` calls, which races)

---

## 10. State of implementation

### ✅ Done
- PWA scaffold: manifest, icons, Workbox service worker (auto-update,
  network-first for HTML, cache-first for images, stale-while-revalidate
  for JS/CSS)
- XLSX persistence via SheetJS + File System Access API
- File handle persistence between sessions (raw IndexedDB)
- 12 screens (including ActivityEditor)
- Activity model: per-child, days/time/place/needsRide, recurring or one-time
- Activity → Event auto-generation (today → end of month, deterministic IDs)
- Rides Board: child-colour filter tabs + background tint when filtered
- Dashboard: week and month open-ride-request counters
- Recurrence expander, ride state machine, conflict detector (28 tests, all green)
- Local config stored in Config tab (theme, language, landing screen, etc.)

### 🚧 Known gaps
- File handle auto-reopen works on desktop Chrome; iOS Safari does not
  support persistent `FileSystemFileHandle` storage
- No conflict-resolution UI (detector exists in `conflictDetector.ts`)
- `CommonActivityEditorScreen.tsx` still exists in the file system but has
  no route — it is dead code and can be deleted

### ❌ Not started
- Google Drive auto-upload of the XLSX file
- Web Push notifications
- Group join-by-code flow
- Hebrew localisation

---

## 11. Things that will bite you

- **File System Access API is HTTPS-only** outside `localhost`.
- **`showOpenFilePicker` / `showSaveFilePicker` type declarations** live in
  `src/file-system-access.d.ts`. Don't remove it — TypeScript's built-in DOM
  lib doesn't include these yet.
- **SheetJS `Uint8Array` + `Blob`** — SheetJS returns `Uint8Array` whose
  `.buffer` is typed as `ArrayBufferLike`. Cast: `new Uint8Array(raw).buffer as ArrayBuffer`.
- **Stale closure trap** — all mutations read `dataRef.current`, never `data`.
  See §8. Breaking this causes silent data loss (later writes overwrite earlier
  ones with stale state).
- **Bulk vs single upsert** — use `upsertEvents(array)` for multi-event
  writes. `Promise.all(array.map(upsertEvent))` races: each call reads the
  same `dataRef.current` snapshot before any of them writes back.
- **Activity IDs are deterministic** — `act-{childId.slice(-6)}-{slug}-{date}`.
  Re-saving an activity does NOT duplicate events; it upserts them.

---

## 12. Quick sanity check

```bash
npm test          # expect: 28 passed, 0 failed, ~1s
npm run typecheck # expect: no errors
npm run build     # expect: ✓ built, dist/sw.js generated
```

---

## 13. Rules of thumb

1. **Edit `src/`, test with `tests/`.** No fixtures in `src/`.
2. **New screen → register in `App.tsx` + maybe `TabBar.tsx`.** Sub-routes
   (e.g. `/events/:id`) should NOT appear in the tab bar.
3. **All storage changes go in `xlsxStorage.ts`.** Update `buildWorkbook()`
   and `parseWorkbook()` together.
4. **Never commit `dist/`, `dev-dist/`, `node_modules/`, `*.xlsx` data files.**
