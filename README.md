# Kids Rides & Classes — PWA

A **Progressive Web App** that helps parent groups coordinate children's
classes and shared rides. Installs on Android and iPhone from the browser —
no app store, no backend server, no cloud account required.

**Stack:** React 18 · TypeScript · Vite · Vitest · SheetJS (xlsx) ·
Workbox service worker · React Router.

---

## What it does

Parenting groups juggle a lot of logistics — who drives whom, which week a
child has music vs. football, who already committed to the Tuesday pickup.
This app makes that shared knowledge explicit and keeps it in a single file
you control.

- **One file, your storage** — everything lives in an `.xlsx` file you open
  from your device. Put it in Google Drive, iCloud, a USB stick — your choice.
- **No accounts** — enter your name + email once when creating the file.
  After that, just open the file and the app knows who you are.
- **Activities per child** — each child has a list of activities (e.g.
  "Football", "Piano"). An activity defines the days of week, start/end time,
  place, and whether it needs ride coordination. Saving an activity
  automatically generates events for today through the end of the current month.
- **Events** — auto-generated from activities (or added manually). Each event
  has a date/time, location, and optional ride request.
- **Ride volunteering** — any parent can claim a ride leg (**TO**, **FROM**,
  or **BOTH**). The Rides Board shows what's unclaimed, claimed, confirmed,
  or done. Filter by child to see that child's colour-tinted view.
- **Offline-first** — the app shell is cached by the service worker. Once the
  file is open, everything works without a network connection.
- **Installable** — Add to Home Screen on iOS; browser install prompt on
  Android/Chrome.

---

## XLSX file format

The app reads and writes a single `.xlsx` file (conventionally `idrive.xlsx`).

| Tab | Content |
|---|---|
| `Config` | App settings (key-value rows) + children list (with activities as JSON) |
| `0426`, `0526`, … | One tab per month (`MMYY`) — events and ride assignments |

Monthly tabs are created automatically when an event is saved for that month.

---

## Who it's for

- A group of 3–20 parents coordinating one or more children's activities
- Families who'd rather not push their logistics into a chat group
- Anyone who wants their family data to stay in a file they own

---

## How it's built

```
src/
├── domain/         ← pure TS: enums, models, config — no side effects
├── storage/
│   └── xlsxStorage.ts   ← all XLSX I/O (SheetJS + File System Access API)
│                          also persists FileSystemFileHandle in IndexedDB
├── state/
│   └── AppContext.tsx    ← React context: fileHandle, AppData, all mutations
├── components/     ← Header, TabBar, ChildDot, RideStatusChip
├── screens/        ← one file per screen (see screen list below)
├── pwa/            ← service-worker registration (Workbox)
├── lib/            ← format helpers, useInstallPrompt
├── file-system-access.d.ts  ← TS declarations for showOpenFilePicker / showSaveFilePicker
├── App.tsx         ← router + Shell (guards: loading → open-file → main app)
└── main.tsx        ← entry point
```

### Screens

| Route | Screen | Purpose |
|---|---|---|
| *(no file)* | `OpenFileScreen` | Open existing or create new `.xlsx` |
| `/` | `DashboardScreen` | Upcoming events, my rides, open ride requests (week + month) |
| `/children` | `ChildrenScreen` | List children; inline add |
| `/children/:id` | `ChildDetailScreen` | Edit child profile + activities list |
| `/children/:id/activities/:idx` | `ActivityEditorScreen` | Add/edit activity → generates events |
| `/events` | `EventsScreen` | All events list |
| `/events/new` `/events/:id` | `EventEditorScreen` | Add/edit a single event |
| `/rides` | `RidesBoardScreen` | Claim/unclaim ride legs; filter by child |
| `/my-rides` | `MyRidesScreen` | My own claimed rides |
| `/notifications` | `NotificationsScreen` | Notification log |
| `/settings` | `SettingsScreen` | Theme, language, reminders, locations; close file |

---

## Get started

→ **[`gettingStarted.md`](./gettingStarted.md)** — install, run, test, build, deploy.

Quick start if Node 20+ is already installed:

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 28 Vitest domain tests
npm run build        # dist/ — deploy to any static host
```

Open the app → **Create new file** (enter name + email) or **Open existing file**.

> **Note:** The File System Access API requires a **secure context** (HTTPS
> or `localhost`). `npm run dev` works on localhost. To test from a phone on
> LAN use `vite preview --https` or a tunnel.

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
| XLSX persistence (SheetJS + File System Access API) | ✅ |
| File handle persistence between sessions (IndexedDB) | ✅ |
| 12 screens (including ActivityEditor) | ✅ |
| Activity → Event auto-generation (today → end of month) | ✅ |
| Rides Board with child-colour filter + tint | ✅ |
| Dashboard: week + month open ride request counts | ✅ |
| Domain tests (28 Vitest cases) | ✅ |
| Google Drive auto-upload of the XLSX file | 🚧 deferred |
| Web Push notifications | ❌ |
| Group join-by-code flow | ❌ |
| Hebrew localisation | ❌ |

---

## Privacy posture

No accounts, no server, no analytics. Your data lives entirely in the `.xlsx`
file you choose. The service worker caches the app shell locally. Clearing
browser data removes the cached shell and the stored file handle, but your
`.xlsx` file is untouched wherever you saved it.
