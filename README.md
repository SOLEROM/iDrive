# Kids Rides & Classes Manager

An Android app that helps parent groups coordinate children's classes and
shared rides — without relying on spreadsheets, group chats, or a dedicated
backend server.

**Package:** `i.drive.kids` · **minSdk:** 26 · **targetSdk:** 35

---

## What it does

Parenting groups juggle a lot of logistics — who drives whom, which week a
child has music vs. football, who already committed to the Tuesday pickup.
This app makes that shared knowledge explicit and keeps it synced across
every parent's phone.

- **Private, per-parent storage** — each parent's children, preferences, and
  private events live in their *own* Google Drive. No central server sees it.
- **Shared group coordination** — each parent group uses a shared Google
  Sheet for ride-relevant activities: who's going, who volunteered to drive,
  what's been completed.
- **Ride volunteering** — any parent in the group can volunteer for a ride
  leg (**TO**, **FROM**, or **BOTH**). The Rides Board shows what's
  unassigned, claimed, confirmed, or done.
- **Recurring events** — weekly, multi-day, every-N-weeks; one-time overrides
  supported.
- **Offline first** — everything is cached in Room. Sync happens in the
  background when the network is available.
- **Conflict resolution** — built-in UI for when two parents edit the same
  row out of sync.

---

## Who it's for

- A group of 3–20 parents coordinating one or more children's activities
- Families who'd rather not push their logistics into Google Calendar or a
  chat group
- Anyone who wants their family data to stay in their own Drive, not a
  vendor's server

---

## How it's built

- **Kotlin** + **Jetpack Compose** (Material 3)
- **Room** for local cache, **DataStore** for preferences
- **Google Drive API** (private parent data) + **Google Sheets API**
  (shared group data) — mocked in debug builds
- **Hilt** (DI), **WorkManager** (background sync), **Navigation Compose**
- **Offline-first**, **immutable-by-default**, ~100 small files over a few
  big ones

See `ARCHITECTURE.md` for the full picture.

---

## Status

| Area | Status |
|---|---|
| UI (14 screens) | ✅ |
| Local storage (Room) | ✅ |
| Mock Drive + Sheets adapters | ✅ |
| Sync engine (against mocks) | ✅ |
| Conflict resolution UI | ✅ |
| Unit tests (42 cases) | ✅ |
| Real Google Drive/Sheets integration | 🚧 deferred (Phase 4) |
| FCM push notifications | ❌ |
| Group join flow (by code) | ❌ |
| Hebrew localisation | ❌ |
| Integration / UI tests | ❌ inventoried only |

Detailed breakdown in `CLAUDE.md` §7.

---

## Get started

→ **[`gettingStarted.md`](./gettingStarted.md)** — build, test, emulate, deploy.

→ **[`install.md`](./install.md)** — set up a fresh Ubuntu host from scratch
(or just run `./install.sh`).

---

## Documentation map

| Doc | What's in it |
|---|---|
| **[`gettingStarted.md`](./gettingStarted.md)** | Build, test, emulate, deploy — the developer workflow |
| **[`install.md`](./install.md)** | Fresh-host setup (Ubuntu) |
| **[`CLAUDE.md`](./CLAUDE.md)** | Context pack for future Claude Code sessions — conventions, known hazards, implementation status |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Module layout, data flow, sync lifecycle |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | All entities, Drive JSON schema, Sheet schema |
| [`SYNC_DESIGN.md`](./SYNC_DESIGN.md) | Sync triggers, conflict policy, retry logic |
| [`CONFIG_MODEL.md`](./CONFIG_MODEL.md) | All 4 config scopes and their fields |
| [`UX_GUIDELINES.md`](./UX_GUIDELINES.md) | Color rules, screen inventory, component patterns |
| [`BUILD_AND_RELEASE.md`](./BUILD_AND_RELEASE.md) | Full build, sign, install, and sideload reference |
| [`TEST_PLAN.md`](./TEST_PLAN.md) | Manual QA flows and automated test inventory |
| [`plan1.md`](./plan1.md) | Original product spec (authoritative for product intent) |

---

## Privacy posture

No accounts on our server — there is no "our server". Data lives in the
parent's Google Drive (private data) or the group's shared Google Sheet
(coordination data). Parents can revoke access at any time by removing the
app from their Google account.
