# CLAUDE.md — Context pack for future Claude Code sessions

Read this first whenever you start a session in `/mnt/idrive`. It is the
shortest path from zero context to productive work.

---

## 1. What this project is

**Kids Rides & Classes Manager** — a Progressive Web App (PWA) for parent
groups to coordinate children's classes and shared rides.

- Stack: **React 18 + TypeScript + Vite + Vitest + Dexie (IndexedDB) +
  Workbox service worker + React Router**
- Installable on Android (Chrome install prompt) and iOS (Add to Home Screen)
- Offline-capable via service worker precache + IndexedDB
- Adapters (`DriveAdapter` / `SheetsAdapter`) abstract over Google Drive and
  Sheets; debug builds use in-memory mocks
- Mocks seed two demo events (Piano Lesson, Soccer Practice) per sheet on
  first read — exercised by `MockSheetsAdapter` tests

The original Android-native version was retired on 2026-04-18 and replaced
by this PWA per `plan2.md`. See git history if you need the Kotlin source.

---

## 2. Repo layout

```
/mnt/idrive/
├── README.md                    ← user-facing entry point
├── CLAUDE.md                    ← THIS file
├── gettingStarted.md            ← developer workflow
├── install.sh                   ← one-shot host setup (installs Node 20 + npm install)
├── plan1.md                     ← original product spec (authoritative for intent)
├── plan2.md                     ← PWA migration brief
│
├── package.json                 ← npm scripts + deps
├── tsconfig.json                ← strict TS, @/* → src/*
├── vite.config.ts               ← Vite + vite-plugin-pwa (manifest + Workbox)
├── index.html                   ← entry HTML (PWA meta tags + apple-touch)
├── .gitignore                   ← node_modules, dist, dev-dist, coverage, etc.
│
├── public/
│   ├── favicon.svg
│   └── icons/                   ← icon-192, icon-512, icon-maskable (SVG)
│
├── src/
│   ├── main.tsx                 ← entry
│   ├── App.tsx                  ← router + shell
│   ├── styles.css               ← global styles (mobile-first, dark mode)
│   ├── vite-env.d.ts
│   ├── domain/                  ← enums, models, recurrence, rideStateMachine, conflictDetector, config
│   ├── storage/                 ← db.ts (Dexie schema) + repository.ts (CRUD + sync queue)
│   ├── remote/                  ← DriveAdapter / SheetsAdapter + mock/ implementations + privateDriveData
│   ├── services/                ← SyncEngine
│   ├── state/                   ← AppContext (parent, config, sync state)
│   ├── components/              ← Header, TabBar, SyncBanner, ChildDot, RideStatusChip
│   ├── screens/                 ← SignIn, Dashboard, Children, ChildDetail, Events, EventEditor,
│   │                              RidesBoard, MyRides, Notifications, Settings
│   ├── pwa/registerSW.ts        ← service worker registration
│   └── lib/                     ← useLiveQuery, format
│
└── tests/
    ├── setup.ts                 ← fake-indexeddb + per-test DB reset
    ├── domain/                  ← recurrence (7), rideStateMachine (14), conflictDetector (7)
    ├── config/configParser (6)
    ├── remote/                  ← privateDriveData (2), mockSheetsAdapter (6)
    └── services/                ← syncEngine (2)
                                    TOTAL: 44 cases
```

---

## 3. How to build, test, run

```bash
# one-time
./install.sh              # or: npm install

# day-to-day
npm run dev               # http://localhost:5173 — Vite HMR
npm test                  # Vitest — 44 cases, ~2s
npm run typecheck         # tsc --noEmit
npm run build             # dist/  (includes sw.js + manifest.webmanifest)
npm run preview           # http://localhost:4173 — serve built dist/
```

The dev server binds to LAN (`host: true`) so you can hit it from a phone
on the same Wi-Fi. iOS needs HTTPS for service workers — use
`vite preview --https` or a tunnel.

---

## 4. Conventions that matter

- **TypeScript strict mode** — `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch` all on
- **Immutability** — always spread (`{ ...obj, field: v }`), never mutate
- **Many small files** — one screen per file under `src/screens/`, one
  component per file under `src/components/`
- **Enums as `const` objects + `type` union** (not TS `enum`) — avoids
  runtime gotchas, serializes as plain strings
- **`@` alias → `src/`** — use `@/domain/...` not `../../domain/...`
- **Adapter boundary is sacred** — `DriveAdapter` / `SheetsAdapter` are the
  only contracts to respect when porting to real Google APIs. Do not leak
  Google SDK types into `domain/`
- **Repositories return Promises or Dexie Observables** — mutations write
  IndexedDB first, then `enqueue()` a sync op into `syncQueue`. The
  `SyncEngine` drains the queue.
- **LiveQuery for reactive UI** — `useLiveQuery(() => repo.observeAll(), [])`
  keeps the view in sync with IndexedDB.

---

## 5. State of implementation

### ✅ Done
- PWA scaffold: manifest, icons, Workbox service worker (auto-update,
  network-first for HTML, cache-first for images, stale-while-revalidate
  for JS/CSS)
- IndexedDB via Dexie — 7 tables (parents, children, events, assignments,
  groups, notifications, syncQueue)
- Mock Drive + Sheets adapters behind the real adapter interfaces
- Sync engine: pushes queued ops → Drive/Sheets, pulls group events/
  assignments/notifications back into IndexedDB
- 12 screens: SignIn, Dashboard, Children, ChildDetail, Events,
  EventEditor, RidesBoard, MyRides, Notifications, Settings (+ internal
  Header/TabBar/SyncBanner components)
- Recurrence expander, ride-assignment state machine, conflict detector —
  all ported from Kotlin with identical behaviour (43 original test cases +
  2 new sync-engine integration tests = 44 green)
- Local config (theme, language, landing screen, sync prefs) persisted in
  `localStorage`

### 🚧 Partial
- `SyncEngine` only runs on demand (Settings → *Sync now* or programmatic).
  Background sync via Workbox's `BackgroundSyncPlugin` would be the next
  step.
- Conflict resolution surface exists in `conflictDetector.ts` but no
  dedicated screen yet.

### ❌ Not started
- Real Google OAuth + Drive/Sheets API calls (interfaces are in place)
- Web Push notifications
- Group join-by-code flow
- Hebrew localisation

---

## 6. Things that will bite you

- **Service workers need HTTPS** outside of `localhost`. `vite preview`
  serves HTTP by default — use `--https` or a tunnel for iOS testing.
- **Dexie singleton + tests** — `tests/setup.ts` imports
  `fake-indexeddb/auto` and calls `__resetDb()` between tests. Don't
  hand-close the db elsewhere or the next test will see `DatabaseClosedError`.
- **`parseConfig` strips unknown keys** by design, so forward-compat JSON
  from a future version is silently dropped-on-the-floor safe.
- **Booleans are unreliable IndexedDB index keys** — we filter in memory
  via `toArray().filter(...)` instead of `.where("isArchived").equals(...)`.
- **Workbox precache list** — `vite.config.ts` globs `**/*.{js,css,html,svg,png,ico,webmanifest}`.
  If you add binary asset types (e.g. `.woff2`) and want them offline,
  extend `globPatterns`.
- **Cache-busting** — hashed filenames in `dist/assets/*` are safe to cache
  long-term; `sw.js` and `manifest.webmanifest` MUST NOT be. Nginx snippet
  in `gettingStarted.md` §5B is correct; double-check other hosts.

---

## 7. Quick sanity check

Before starting real work:

```bash
npm test
```

Expected: **44 passed**, 0 failed, ~2 seconds.

```bash
npm run build
```

Expected: `✓ built in …s`, `dist/sw.js` + `dist/workbox-*.js` generated,
no TypeScript errors.

If either fails on a clean checkout, the environment drifted — investigate
before piling on changes.

---

## 8. Working with this repo — rules of thumb

1. **Edit `src/`, test with `tests/`.** Don't put test fixtures in `src/`.
2. **Add a screen → register in `App.tsx` and maybe `TabBar.tsx`.** Routes
   that aren't top-level (e.g. `/events/:id`) shouldn't appear in the tab
   bar.
3. **Touching storage → bump the Dexie version** in `src/storage/db.ts`
   and add a migration callback.
4. **Touching the adapter interfaces → update BOTH mock impls + tests.**
5. **Never import from `dexie` outside `src/storage/` or tests.** The rest
   of the code should only see repositories.
6. **Never commit `dist/`, `dev-dist/`, `node_modules/`, `coverage/`, or
   anything in `.env*`.** `.gitignore` guards them.
