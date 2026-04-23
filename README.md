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
  "Football", "Piano"). An activity defines the days of week, start/end time,
  place, and whether it needs ride coordination. Saving an activity
  automatically generates events for today through the end of the current month.
- **Events** — auto-generated from activities (or added manually). Each event
  has a date/time, location, and optional ride request.
- **Ride volunteering** — any parent can claim a ride leg (**TO**, **FROM**,
  or **BOTH**). The Rides Board shows what's unclaimed, claimed, confirmed,
  or done. Filter by child to see that child's colour-tinted view.
- **Offline-first** — Firestore caches all data locally (IndexedDB). The app
  works without a network connection; changes sync automatically on reconnect.
- **Installable** — Add to Home Screen on iOS; browser install prompt on
  Android/Chrome.
- **Backup** — download a snapshot of all group data as an `.xlsx` file
  from Settings.

---

## Who it's for

- A group of 3–20 parents coordinating one or more children's activities
- Families who'd rather not push their logistics into a chat group
- Anyone who wants real-time coordination without managing a server

---

## How it's built

```
src/
├── domain/         ← pure TS: enums, models, config — no side effects
├── storage/
│   └── xlsxStorage.ts   ← xlsx backup export (SheetJS, write-only)
├── state/
│   └── AppContext.tsx    ← React context: Firebase auth, Firestore listeners, all mutations
├── firebase.ts          ← Firebase app init (Auth + Firestore with offline persistence)
├── familiesData.ts      ← auto-generated from families.yaml at build time
├── components/     ← Header, TabBar, ChildDot, RideStatusChip
├── screens/        ← one file per screen (see screen list below)
├── pwa/            ← service-worker registration (Workbox)
├── lib/            ← format helpers, useInstallPrompt
├── App.tsx         ← router + Shell (guards: loading → sign-in → main app)
└── main.tsx        ← entry point
```

### Screens

| Route | Screen | Purpose |
|---|---|---|
| *(not signed in)* | `OpenFileScreen` | Google Sign-In |
| `/` | `DashboardScreen` | Upcoming events, my rides, open ride requests (week + month) |
| `/children` | `ChildrenScreen` | List children; inline add |
| `/children/:id` | `ChildDetailScreen` | Edit child profile + activities list |
| `/children/:id/activities/:idx` | `ActivityEditorScreen` | Add/edit activity → generates events |
| `/events` | `EventsScreen` | All events list |
| `/events/new` `/events/:id` | `EventEditorScreen` | Add/edit a single event |
| `/rides` | `RidesBoardScreen` | Claim/unclaim ride legs; filter by child |
| `/my-rides` | `MyRidesScreen` | My own claimed rides |
| `/notifications` | `NotificationsScreen` | Notification log |
| `/settings` | `SettingsScreen` | Theme, language, reminders, locations, members, sign out |

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
deterministically from the family name — same name always → same group, across
deploys).

---

## Get started

→ **[`gettingStarted.md`](./gettingStarted.md)** — Firebase setup, install, run, test, deploy.

Quick start if Node 20+ is installed and Firebase is configured:

```bash
npm install
npm run dev          # http://localhost:5173  (sign-in works on localhost)
npm test             # 28 Vitest domain tests
./run.sh --firebase  # build + deploy to Firebase Hosting
```

---

## Installability

**Android (Chrome / Edge)** — tap the "Install app" prompt or browser menu →
*Install app*. The app opens full-screen like a native install.

**iPhone / iPad (Safari)** — tap Share → *Add to Home Screen*. iOS launches
it as a standalone app without the Safari chrome.

---

## Status

| Area | Status |
|---|---|
| PWA scaffold + Workbox service worker | ✅ |
| Install manifest (Android + iOS) | ✅ |
| Firebase Auth (Google Sign-In) | ✅ |
| Firestore real-time sync (offline-capable) | ✅ |
| `families.yaml` membership management | ✅ |
| Firebase Hosting (`idrive-8bcdc.web.app`) | ✅ |
| 12 screens (including ActivityEditor) | ✅ |
| Activity → Event auto-generation (today → end of month) | ✅ |
| Rides Board with child-colour filter + tint | ✅ |
| Dashboard: week + month open ride request counts | ✅ |
| Domain tests (28 Vitest cases) | ✅ |
| xlsx backup download | ✅ |
| Web Push notifications | ❌ |
| Hebrew localisation | ❌ |

---

## Privacy posture

Data is stored in **Firebase Firestore** under your Firebase project, isolated
per family group. Only email addresses listed in `families.yaml` can access
any group's data — enforced by Firestore security rules server-side.

The service worker caches the app shell for offline use. Signing out clears
the locally cached group association from localStorage; the Firestore SDK's
offline cache (IndexedDB) is cleared by the browser's "Clear site data".
