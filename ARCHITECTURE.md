# Architecture — Kids Rides & Classes Manager

## Package: `i.drive.kids` | minSdk 26 | targetSdk 35

---

## 1. Module Structure

Single-module app with layered internal packages:

```
i.drive.kids/
  App.kt                      Application + Hilt entry point
  MainActivity.kt             Single Activity (Compose host)
  di/                         Hilt modules (Database, Remote, Repository, Sync, Json, DataStore)
  domain/
    model/                    Pure Kotlin data classes (no Android deps)
    repository/               Repository interfaces
    recurrence/               RecurrenceExpander — expands RecurrenceRule into occurrences
    rides/                    RideAssignmentStateMachine — transition validation
  data/
    local/
      db/                     AppDatabase (Room) + Converters
      dao/                    One DAO per entity (Parent, Child, Group, Event,
                              RideAssignment, Reminder, Notification, SyncQueue)
      entity/                 Room entity classes + EntityMappers
    remote/
      DriveAdapter.kt         Interface
      SheetsAdapter.kt        Interface
      PrivateDriveData.kt     Root JSON schema for the per-parent Drive file
      mock/                   Mock implementations (default for debug/test)
      google/                 Real Google API implementations (Phase 4 — deferred)
    repository/               Repository implementations
    sync/                     SyncEngine, SyncStatus, SyncWorker, ConflictDetector
  ui/
    theme/                    Compose theme, colors, typography, spacing
    navigation/               NavGraph, Route definitions
    screen/                   One sub-package per screen (Screen + ViewModel)
    component/                Shared Composables (ChildColorBadge, RideStatusChip,
                              SyncBanner, DateHeader)
  config/                     AppLocalConfig, ParentPrivateConfig,
                              GroupSharedConfig, SyncConfig, UiPreferenceConfig
```

---

## 2. Data Flow

```
UI (Compose) → ViewModel → UseCase → Repository Interface
                                          ↓              ↓
                                    Room (cache)   SyncEngine
                                                       ↓         ↓
                                               DriveAdapter  SheetsAdapter
                                               (mock / real) (mock / real)
```

- ViewModels expose `StateFlow` / `SharedFlow`.
- Repositories return `Flow` from Room; background sync updates Room, which re-emits to UI.
- All mutations write to Room first, then enqueue a sync operation.
- SyncEngine drains the queue and pushes to Drive/Sheets.

---

## 3. Google Integration Switch

`BuildConfig.USE_MOCK_GOOGLE` (true in debug, false in release):

```kotlin
// di/RemoteModule.kt
@Provides
fun provideDriveAdapter(...): DriveAdapter =
    if (BuildConfig.USE_MOCK_GOOGLE) MockDriveAdapter() else GoogleDriveAdapter(...)
```

---

## 4. Storage Architecture

| Layer | Technology | Purpose |
|---|---|---|
| Private remote | Google Drive JSON file | Source of truth for parent/child/private events/prefs |
| Shared remote | Google Sheets (6 tabs) | Source of truth for group events, rides, assignments |
| Local cache | Room (SQLite) | Fast UI, offline reads, sync queue |
| Local prefs | DataStore (Proto) | App-local config, session tokens |

**Rule:** Google Drive / Sheets = remote source of truth. Room = read cache only.

---

## 5. Sync Lifecycle

Triggers:
1. App launch (cold start)
2. App foreground resume (if >5 min since last sync)
3. After any local mutation
4. Manual pull-to-refresh
5. WorkManager periodic (configurable interval, default 30 min)
6. Network reconnect via ConnectivityManager callback

Flow per sync:
1. Lock sync mutex (prevent concurrent sync)
2. Push pending local mutations from SyncQueue
3. Pull remote state (Drive JSON + all Sheet tabs)
4. Merge into Room with ConflictDetector
5. Emit sync result (success / partial / conflict / error)
6. Schedule retry on failure with exponential backoff

---

## 6. Offline Behavior

- All reads serve Room cache.
- Mutations write to Room immediately (optimistic UI).
- SyncQueue stores pending operations persistently.
- On reconnect, SyncEngine replays the queue.
- Max queue size: configurable (default 500 ops).

---

## 7. Conflict Resolution

| Case | Policy |
|---|---|
| Simple field, newer timestamp | Last-write-wins |
| Ride assignment claimed by two parents simultaneously | CONFLICT state, shown in Conflict Resolution screen |
| Deleted entity vs edited entity | Deletion wins unless user manually restores |
| Recurring event with both sides changed recurrence fields | Flag for review in Conflict Resolution screen |

---

## 8. Dependency Injection

Hilt with the following modules:
- `DatabaseModule` — Room db + all DAOs
- `RemoteModule` — DriveAdapter + SheetsAdapter (mock or real)
- `RepositoryModule` — all repository bindings
- `SyncModule` — SyncEngine, SyncQueue, ConflictDetector
- `ConfigModule` — DataStore instances
- `UseCaseModule` — use cases

---

## 9. Navigation

Compose Navigation with a single NavHost. Route constants in `Screen` sealed class. Deep-link support for notification taps (to specific event or ride).

---

## 10. Background Work

WorkManager `PeriodicWorkRequest` for background sync. Uses `CoroutineWorker`. Respects network constraint (optional WiFi-only mode).

---

## 11. String Externalization

All user-visible strings in `res/values/strings.xml`. Prepared for `res/values-iw/strings.xml` (Hebrew). No hardcoded strings in Composables.

---

## 12. Domain Utilities

- **`domain/recurrence/RecurrenceExpander`** — expands a `RecurrenceRule` into concrete
  `Event` occurrences within a `[windowStart, windowEnd]` range. Supports weekly
  frequency with `intervalWeeks`, multi-day-of-week, and optional `endDate`.
  Hard cap of 520 occurrences as a safety net against unbounded expansion.
- **`domain/rides/RideAssignmentStateMachine`** — authoritative transition matrix for
  `AssignmentStatus`. Used by repositories, sync engine, and UI to reject invalid
  state changes. `COMPLETED` is terminal; `CANCELLED → UNASSIGNED` is the explicit
  restore path.

Both are pure Kotlin objects with no Android dependencies and are exhaustively
tested in `app/src/test/java/.../domain/`.

---

## 13. Build & Tooling

- Kotlin 2.0.0, KSP 2.0.0-1.0.22, AGP 8.5.2, Compose BOM 2024.06.00
- Room 2.6.1, Hilt 2.51.1, Navigation-Compose 2.7.7, WorkManager 2.9.0
- Gradle 8.7, JVM target 17, core library desugaring for `java.time` on minSdk 26
- Material 3 ≥ 1.2 (use `SwipeToDismissBox`, not `SwipeToDismiss`)
- `compose-material-icons-extended` is a required dependency (screens use
  `Icons.Default.Group`, `Sync`, `DarkMode`, `Language`, etc.)

Reproducible build environment is defined in `Dockerfile`; all final artifacts
(APKs, AABs, dist bundles) land in `out/`.

---

## 14. TODO (Deferred)

- Push notifications (FCM + server-side trigger)
- Group join flow (join code / sheet ID entry)
- Real `google/` adapter implementations (currently only `mock/` exists)
- `app/src/androidTest` integration & UI tests (TEST_PLAN.md has the inventory)
