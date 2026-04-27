# Kids Rides & Classes — PWA

A **Progressive Web App** that helps parent groups coordinate children's
classes and shared rides. Installs on Android and iPhone from the browser —
no app store, no server to run yourself.

**Stack:** React 18 · TypeScript · Vite · Vitest · Firebase (Firestore + Auth) ·
Workbox service worker · React Router.

---

## What it does

Parenting groups juggle a lot of logistics — who drives whom, which week a
child has music vs. football, who already committed to the Tuesday pickup.
This app makes that shared knowledge explicit and keeps everyone on the same
page in real time.

- **Real-time sync** — all group members see changes within ~1 second, on any
  device, anywhere. Powered by Firebase Firestore with offline caching.
- **Google sign-in** — one tap to sign in. No passwords.
- **Family groups** — the app admin manages a `families.yaml` file that maps
  Google accounts to family groups. Only listed email addresses can sign in.
- **Activities per child** — each child has a list of activities (e.g.
  "Football", "Piano"). An activity defines the days of week and per-day
  start / end times, place, and ride coordination. Saving an activity
  generates events for today through the end of next month, and the rolling
  regenerator on app open keeps the calendar permanently full.
- **Generate further** — from each child's screen pick any month up to a
  year ahead and Generate to extend events to that month. Picking the
  current month switches to **Reset & regenerate**, a confirmed flow that
  rebuilds from today onward (past events are never touched).
- **Events** — auto-generated from activities (or added manually). Each
  event has a date/time, location, child badge (name + colour) and optional
  ride request. Calendar week + month views with prev/next navigation.
- **Rides** — any parent can claim a ride leg (**TO**, **FROM**, or both)
  for themselves, assign it to another family member, or pick **Other…**
  to record an external (non-member) driver by name. Future-only board,
  sorted by date, filterable by child. Per-leg actions: Accept, Release,
  Done, Undo done. Override-confirm prompt before stealing a leg from
  another parent. External rides render with a red wash on every screen so
  the family can verify out-of-group coverage at a glance.
- **Dashboard** — Greeting on the left, today's weekday + date on the
  right; **My rides** on top (same-day Done button, external rides shown
  in red and visible to every member); **Upcoming events** (Today / 7 days
  filter, default Today); week + month open-leg counts.
- **Calendar Day view** — `/events` opens to a calendar-style timeline
  for the cursor day: hour gutter, events as colour-coded boxes by child,
  with title, child name, time range and assigned drivers per leg. Round
  trips with both legs covered get a green ✓. Today's now-line is shown
  in red. Week and Month views remain available with prev/next navigation.
- **Hebrew language** — switch Settings → Language to Hebrew and the day
  names, dates, calendar headers, mode pills and dashboard chrome flip to
  Hebrew immediately. Stored data stays in English; only display goes
  through `t(key, language)` and `Intl.*` with the user's locale.
- **Offline-first** — Firestore caches all data locally (IndexedDB). The
  app works without a network connection; changes sync automatically on
  reconnect.
- **Installable** — Add to Home Screen on iOS; browser install prompt on
  Android/Chrome; service-worker update banner ("Reload" / "Later").
- **Backup + analytics** — from Settings, download a recovery `.xlsx`
  snapshot OR an analytics-shaped flat workbook (`Events`,
  `Assignments`, `Activities`, `Summary` sheets) ready for pivots.

---

## Who it's for

- A group of 3–20 parents coordinating one or more children's activities
- Families who'd rather not push their logistics into a chat group
- Anyone who wants real-time coordination without managing a server

---

## How it's built

```
src/
├── domain/        ← pure TS: enums, models, ids, timeWindow,
│                    activityExpander, rollingWindow, recurrence,
│                    rideStateMachine, conflictDetector
├── data/          ← only layer that imports firebase / xlsx
│                    firebase.ts, paths.ts, familiesBundle.ts,
│                    {auth,group,parents,children,events,assignments}Repo.ts,
│                    xlsxExporter.ts (lazy-imported)
├── state/         ← React glue: AppContext, useAuth, useGroupData,
│                    useLocalConfig, useTheme, useRollingRegen
├── components/    ← Header, TabBar, ChildDot, ChildBadge,
│                    MemberPicker, RideStatusChip, UpdateBanner
├── screens/       ← one file per screen (see table below)
├── pwa/           ← service-worker registration (Workbox) + update bus
├── lib/           ← format helpers, i18n, useInstallPrompt
├── App.tsx        ← router + Shell + LandingRedirector
├── styles.css
├── familiesData.ts (generated)
└── main.tsx       ← entry point
```

Layering rule: **`ui → state → data → domain`**, never the other direction.
Only `src/data/` imports `firebase/*` or `xlsx`. Domain has zero side effects
and can run unchanged in a Node test.

### Screens

| Route | Screen | Purpose |
|---|---|---|
| *(not signed in)* | `OpenFileScreen` | Google Sign-In |
| `/` | `DashboardScreen` | My rides, upcoming events (Today/7d), open-leg counts |
| `/children` | `ChildrenScreen` | List children; inline add |
| `/children/:id` | `ChildDetailScreen` | Profile, activities, generate-ahead / reset-current-month, delete child |
| `/children/:id/activities/:idx` | `ActivityEditorScreen` | Per-day times; cascades on rename / time change |
| `/events` | `EventsScreen` | Day (calendar timeline) · Week · Month, prev/next nav |
| `/events/new` `/events/:id` | `EventEditorScreen` | Add / edit a single event |
| `/rides` | `RidesBoardScreen` | Today-onward, claim/release/done, member picker |
| `/my-rides` | `MyRidesScreen` | Driver OR claimer view, allowed transitions |
| `/notifications` | `NotificationsScreen` | Stub (no push this round) |
| `/settings` | `SettingsScreen` | Theme, language, reminders, locations, exports, sign out |

---

## Group membership

Group membership is managed by the **app admin** — not by the users themselves.

1. Edit `families.yaml` in the repo root:

```yaml
families:
  - name: solovs
    members:
      - parent1@gmail.com
      - parent2@gmail.com
```

2. Deploy: `./run.sh --firebase`

That's it. The member list is embedded in the app bundle at build time.
Only listed email addresses can sign in. Adding a new member = edit yaml + deploy.

Each family gets its own isolated Firestore group (groupId derived
deterministically from the family name — same name always → same group,
across deploys). The Firestore rules let any current member rewrite
`members[]` only when the writer's own email remains in the new list, so
a `families.yaml` redeploy refreshes the roster while no individual
member can blank everyone else out. The Settings → Members card always
shows the live `families.yaml` roster (with a "not signed in yet" tag
for new members) so you can verify a deploy without waiting for them to
authenticate.

---

## Get started

→ **[`gettingStarted.md`](./gettingStarted.md)** — Firebase setup, install, run, test, deploy.

Quick start if Node 20+ is installed and Firebase is configured:

```bash
npm install
npm run dev          # http://localhost:5173  (sign-in works on localhost)
npm test             # 54 Vitest cases, ~1s
./run.sh --firebase  # build + deploy to Firebase Hosting
```

---

## Installability

**Android (Chrome / Edge)** — tap the "Install app" prompt or browser menu →
*Install app*. The app opens full-screen like a native install.

**iPhone / iPad (Safari)** — tap Share → *Add to Home Screen*. iOS launches
it as a standalone app without the Safari chrome.

When a new version is deployed, an in-app banner offers **Reload** / **Later**.

---

## Status

| Area | Status |
|---|---|
| Layered architecture (`domain · data · state · ui`) | ✅ |
| PWA scaffold + Workbox service worker (auto-update banner) | ✅ |
| Install manifest (Android + iOS) | ✅ |
| Firebase Auth (Google Sign-In) | ✅ |
| Firestore real-time sync (offline-capable) | ✅ |
| Hardened Firestore rules (per-status validTransition, members pinned) | ✅ |
| `families.yaml` membership management | ✅ |
| Firebase Hosting (`idrive-8bcdc.web.app`) | ✅ |
| 12 screens, all using ChildBadge (name + colour everywhere) | ✅ |
| Activity → Event auto-generation + idempotent IDs | ✅ |
| Rolling regeneration on app open | ✅ |
| Generate-future-events + current-month Reset & regenerate | ✅ |
| Delete child with double-confirm cascade | ✅ |
| Rides Board: future-only, sorted, member picker, override-confirm | ✅ |
| Ride state: VOLUNTEERED → COMPLETED, Undo done, Done same-day-only | ✅ |
| External "Other…" driver: assigned to non-member, red on all screens | ✅ |
| Dashboard: greeting + date in header, My rides on top, Upcoming Today/7d | ✅ |
| Events: Day (calendar timeline) + Week + Month, prev/next on each | ✅ |
| Day-view ✓ badge when round-trip event has both legs assigned | ✅ |
| Hebrew language: dates, weekday/mode chips, dashboard chrome | ✅ |
| Members roster auto-refreshes after `./run.sh --firebase` | ✅ |
| xlsx backup download | ✅ |
| xlsx analytics export (flat sheets for pivots) | ✅ |
| 54 Vitest cases (domain + data) | ✅ |
| Conflict-resolution UI | 🚧 |
| Web Push notifications | ❌ |
| Hebrew localisation (every screen + button) | 🚧 |

---

## Privacy posture

Data is stored in **Firebase Firestore** under your Firebase project, isolated
per family group. Only email addresses listed in `families.yaml` can access
any group's data — enforced by Firestore security rules server-side.

The service worker caches the app shell for offline use. Signing out clears
the locally cached group association from localStorage; the Firestore SDK's
offline cache (IndexedDB) is cleared by the browser's "Clear site data".
