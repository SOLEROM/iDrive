# CLAUDE.md — Context pack for future Claude Code sessions

Read this first whenever you start a session in `/mnt/idrive`. It is the
shortest path from zero context to productive work.

---

## 1. What this project is

**Kids Rides & Classes Manager** — an Android native app (Kotlin + Jetpack
Compose) for parent groups to coordinate children's classes and shared rides.

- Package: `i.drive.kids` · minSdk 26 · targetSdk 35 · compileSdk 35
- Google Drive is the remote source of truth (private JSON per parent)
- Google Sheets is the remote source of truth for group-shared data (events,
  ride assignments, notifications)
- Room is the local cache; the app is offline-capable by design
- Debug builds use in-memory **mock** Drive + Sheets adapters
  (`BuildConfig.USE_MOCK_GOOGLE = true`). Real Google adapters are **not yet
  implemented** (Phase 4 / deferred)

The original spec is in `plan1.md`. It is authoritative for product intent;
implementation has diverged in places (tracked below).

---

## 2. Repo layout

```
/mnt/idrive/
├── README.md                    ← user-facing entry point
├── CLAUDE.md                    ← THIS file
├── plan1.md                     ← original product spec
├── ARCHITECTURE.md              ← module layout, data flow, sync lifecycle
├── DATA_MODEL.md                ← entities, Drive JSON, Sheet schema
├── SYNC_DESIGN.md               ← triggers, conflict policy, retries
├── CONFIG_MODEL.md              ← 4 config scopes + all fields
├── UX_GUIDELINES.md             ← color rules, screens, components
├── BUILD_AND_RELEASE.md         ← full build/sign/install/Docker docs
├── TEST_PLAN.md                 ← manual QA + automated test inventory
│
├── Dockerfile                   ← reproducible build env (JDK 17 + Android SDK + Gradle)
├── .dockerignore
├── Makefile                     ← single source of truth for build commands
├── .gitignore
│
├── build.gradle.kts             ← root (plugins only)
├── settings.gradle.kts          ← rootProject.name = "idrive"; include(":app")
├── gradle.properties
├── gradle/
│   ├── libs.versions.toml       ← ALL dependency versions (single source of truth)
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── gradlew / gradlew.bat
│
├── config/                      ← example config templates (committed)
│   ├── app.local.example.json
│   ├── group.shared.example.json
│   └── signing.example.properties
│
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── res/             ← strings.xml, themes.xml, mipmap, xml/
│       │   └── java/i/drive/kids/
│       │       ├── App.kt
│       │       ├── MainActivity.kt
│       │       ├── di/          ← Hilt modules
│       │       ├── domain/
│       │       │   ├── model/           ← pure Kotlin data classes (@Serializable)
│       │       │   ├── recurrence/      ← RecurrenceExpander
│       │       │   ├── rides/           ← RideAssignmentStateMachine
│       │       │   └── repository/      ← interfaces
│       │       ├── data/
│       │       │   ├── local/           ← Room db, DAOs, entities, mappers
│       │       │   ├── remote/          ← DriveAdapter/SheetsAdapter + mock/
│       │       │   ├── repository/      ← impls
│       │       │   └── sync/            ← SyncEngine, ConflictDetector, SyncWorker
│       │       ├── ui/
│       │       │   ├── theme/, navigation/, component/
│       │       │   └── screen/          ← 1 sub-package per screen (Screen + ViewModel)
│       │       └── config/              ← 5 config data classes
│       └── test/
│           └── java/i/drive/kids/       ← JVM unit tests (42 cases, all green)
│
└── out/                         ← FINAL artifacts (APKs, AABs, dist/) — gitignored
```

Directories `.gradle/`, `.gradle-docker/`, `.docker-home/`, `app/build/`,
`keystore/`, `local.properties`, `signing.local.properties` are gitignored.

---

## 3. How to build and test

**Preferred path is Docker** — zero local SDK setup needed.

```bash
# first-time setup (~3 min)
make docker-image          # builds idrive-build:latest
make docker-wrapper        # generates ./gradlew inside the container

# day-to-day
make docker-test           # 42 unit tests (~30s) — ALWAYS green as of 2026-04-18
make docker-build-debug    # → out/KidsRides-debug.apk
make docker-check          # lint + unit tests
make docker-shell          # interactive bash inside the container
```

If you prefer the host toolchain (needs JDK 17 + Android SDK):
```bash
gradle wrapper --gradle-version 8.7    # once
make doctor && make init
make test-unit
make build-debug
```

**Full Makefile target list:** run `make help`. Categories: core (help, doctor,
init, clean, deep-clean), build, test, device, signing, emulator, packaging,
docker.

---

## 4. Known-good versions (gradle/libs.versions.toml)

| Thing | Version | Notes |
|---|---|---|
| Kotlin | 2.0.0 | also sets `compose-compiler` via `kotlin-compose` plugin |
| KSP | 2.0.0-1.0.22 | must match Kotlin 2.0.0 |
| AGP | 8.5.2 | tested up to compileSdk 34; we use 35 with `android.suppressUnsupportedCompileSdk=35` |
| Gradle | 8.7 | pinned in wrapper |
| Compose BOM | 2024.06.00 | brings Material 3 1.2.x (SwipeToDismissBox, not SwipeToDismiss) |
| Room | 2.6.1 | |
| Hilt | **2.51.1** | NOT 2.51.0 — it was pruned from Maven Central |
| Navigation | 2.7.7 | |
| WorkManager | 2.9.0 | |
| DataStore | 1.1.1 | Preferences (not Proto) |
| JDK | 17 | core library desugaring on for `java.time` with minSdk 26 |
| Android cmdline-tools | 11076708 | pinned in Dockerfile |
| Build-tools | 34.0.0 AND 35.0.0 | AGP 8.5.2 auto-provisions 34.0.0; 35.0.0 is our target |

### Don't break these

- **`compose-material-icons-extended`** is a required dep — screens use
  `Icons.Default.Group`, `Sync`, `DarkMode`, `Language`, etc. Remove it and
  several files fail to compile.
- **`SwipeToDismissBox` / `rememberSwipeToDismissBoxState`** — the old
  `SwipeToDismiss` / `rememberDismissState` API was removed in Material 3 ≥ 1.2.
  Two screens use the new API (`ChildrenScreen.kt`, `NotificationsScreen.kt`).
- **Packaging excludes** in `app/build.gradle.kts` — we exclude
  `/META-INF/INDEX.LIST` and `/META-INF/*.kotlin_module` because the Google API
  client jars ship duplicates. Removing them breaks APK packaging.
- **Adaptive launcher icon** at `app/src/main/res/mipmap-anydpi-v26/` +
  `drawable/ic_launcher_foreground.xml` + `values/ic_launcher_background.xml`.
  AndroidManifest references `@mipmap/ic_launcher`; AAPT fails without them.

---

## 5. Conventions that matter

- **Immutability** — always `.copy()` instead of mutating. Applies to domain
  models and Room entity mappers.
- **Many small files** — keep files under ~400 lines, 800 max. One ViewModel
  + one Screen per screen sub-package.
- **`@Serializable` everywhere** — every domain model and config class uses
  `kotlinx.serialization`. `DayOfWeek` needs the custom `DayOfWeekSerializer`
  (see `domain/model/Event.kt`).
- **Json config** — `ignoreUnknownKeys = true`, `encodeDefaults = true` for
  forward-compat; see `di/JsonModule.kt`.
- **No comments unless non-obvious** — well-named identifiers > prose.
- **Repositories return `Flow`** from Room; mutations write Room first, then
  enqueue a sync operation via `SyncQueueDao`.
- **Mock-first** — Phase 4 (real Google APIs) is still deferred. Every new data
  path should have a mock implementation and land in tests before touching
  real APIs.

---

## 6. Final artifacts → `out/`

Every build target drops its output into `out/`:

| Target | Output |
|---|---|
| `make build-debug` | `out/KidsRides-debug.apk` |
| `make build-release` | `out/KidsRides-release-unsigned.apk` |
| `make sign-release` | `out/KidsRides-release.apk` |
| `make bundle-release` | `out/KidsRides-release.aab` |
| `make dist` | `out/dist/` (signed APK + docs) |
| `make deep-clean` | removes `out/` entirely |

`out/` is gitignored (`.gitignore` line with `out/`). Gradle's intermediates
still live in `app/build/` — also gitignored. Never commit either.

---

## 7. State of implementation

### ✅ Done
- Phase 1 — design docs (ARCHITECTURE, DATA_MODEL, SYNC_DESIGN, CONFIG_MODEL,
  UX_GUIDELINES, BUILD_AND_RELEASE, TEST_PLAN).
- Phase 2 — project scaffold: Compose, Hilt, Room, DataStore, WorkManager,
  Navigation. All DI modules wired.
- Phase 3 — local-first app: 14+ screens (splash, sign-in, onboarding,
  dashboard, children, child detail, events, event editor, rides board, my
  rides, notifications, conflict resolution, sync status, settings). Mock
  Drive + Sheets adapters with seed data.
- Phase 5 — build automation: Makefile with all rules from plan §9, Docker
  reproducible env, keystore helpers, signing via env or
  `signing.local.properties`.
- Phase 6 — unit tests: 42 passing cases across 6 classes (recurrence, ride
  state machine, conflict detector, config parser, Drive JSON schema, mock
  sheets adapter).

### 🚧 Partial / in-flight
- Sync engine is wired end-to-end but only against mock adapters.
- Conflict resolution screen exists; the flow has not been exercised on a
  real device.
- `app/src/androidTest` is the empty tree — integration & UI tests are
  inventoried in TEST_PLAN.md but not written.

### ❌ Not started
- Phase 4 — real Google integration (`data/remote/google/` classes). Blocked
  on obtaining a `google-services.json` and SHA-1-registered OAuth client.
- FCM push notifications.
- Group join flow (join by code / sheet ID entry).
- Hebrew localisation (`res/values-iw/strings.xml`).

---

## 8. Things that will bite you

- **Hilt plugin resolution failing** → bump the version in
  `gradle/libs.versions.toml`. Maven Central prunes old Hilt releases
  aggressively.
- **`rememberDismissState` unresolved** → you're looking at stale code. Migrate
  to `SwipeToDismissBox` + `rememberSwipeToDismissBoxState` +
  `SwipeToDismissBoxValue`.
- **Gradle "Could not initialize native services" inside Docker** → you ran
  without `--user $(id -u):$(id -g)`. Use the `make docker-*` targets — they
  set `--user`, `HOME`, and `GRADLE_USER_HOME` correctly.
- **AAPT "resource mipmap/ic_launcher not found"** → adaptive-icon files got
  deleted. Restore `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`,
  `ic_launcher_round.xml`, `drawable/ic_launcher_foreground.xml`, and
  `values/ic_launcher_background.xml`.
- **`MockSheetsAdapter` overwrites your writes** → writes must call
  `seededSheets.add(sheetId)` so `ensureSeedData` doesn't re-seed on next read.
  This was a real bug; tests caught it.
- **Tests for `MockSheetsAdapter` mix seeded + written data** → call
  `writeEvents(sheetId, listOf(...))` first; then `readEvents` returns exactly
  what you wrote (seed is suppressed because of the rule above).

---

## 9. Deliverable checklist (per plan1.md §17)

| Deliverable | Status |
|---|---|
| Android source (Kotlin + Compose) | ✅ |
| Room + mock Google data layers | ✅ (real layer deferred) |
| Makefile | ✅ |
| Sample config templates (`config/*.example.*`) | ✅ |
| README.md | ✅ |
| ARCHITECTURE.md / DATA_MODEL.md / SYNC_DESIGN.md / CONFIG_MODEL.md / UX_GUIDELINES.md / BUILD_AND_RELEASE.md / TEST_PLAN.md | ✅ |
| Unit tests | ✅ (42 cases) |
| Integration tests | ❌ (inventoried only) |
| UI tests | ❌ (inventoried only) |
| Release signing flow | ✅ |
| Dockerised build env | ✅ (extra, beyond plan) |

---

## 10. Working with this repo — rules of thumb

1. **Prefer `make docker-*` over running gradle directly** unless you've
   already got the host toolchain set up and working.
2. **Edit `gradle/libs.versions.toml`, not individual `build.gradle.kts` files**
   when bumping a dependency version.
3. **Write a unit test before touching domain logic.** The tests in
   `app/src/test/` are the reference for how things are *meant* to behave.
4. **When you see a warning during a Gradle build, consider fixing it.** The
   current build emits a handful of deprecation warnings (`Icons.Filled.ArrowBack`
   → `Icons.AutoMirrored.Filled.ArrowBack`, `Divider` → `HorizontalDivider`,
   `flatMapLatest` needing `@OptIn(ExperimentalCoroutinesApi::class)`). They're
   not blocking but they're debt.
5. **Never commit `keystore/`, `*.jks`, `signing.local.properties`,
   `local.properties`, or `google-services.json`.** `.gitignore` guards them;
   double-check with `git check-ignore -v <path>` if uncertain.
6. **Use the existing design docs as the contract.** If you change data shape
   or sync behaviour, update the corresponding `*.md` in the same commit.

---

## 11. Quick sanity check

Before starting real work, run:

```bash
make docker-test
```

Expected: `BUILD SUCCESSFUL`, 42 tests passed, 0 failed. If any test fails on
a clean checkout, something environmental drifted — investigate before
layering on new changes.
