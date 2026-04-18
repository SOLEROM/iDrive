# Build & Release — Kids Rides & Classes Manager

Two supported build paths:

- **Docker** (recommended) — one command, no local SDK required.
- **Host toolchain** — traditional JDK + Android SDK on your machine.

All final artifacts (APKs, AABs, dist bundles) land in `out/`. Gradle's intermediate output (`app/build/…`) is transient.

---

## 1. Prerequisites

### Docker path
- Docker 20+ (daemon running)
- `make`
- ~2 GB disk for the image + Gradle cache

### Host path
- Java 17 (`openjdk-17-jdk` or Temurin 17)
- Android SDK with:
  - `platform-tools` (adb)
  - `platforms;android-34` *and* `platforms;android-35` (AGP 8.5.2 compat + target)
  - `build-tools;34.0.0` *and* `build-tools;35.0.0`
- `make`, `unzip`, `curl`
- Gradle 8.7 (only needed once to bootstrap `./gradlew`)

### Environment variables (host path)
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Verify toolchain
```bash
make doctor            # host path
make docker-image      # docker path: builds the reproducible env
```

---

## 2. Project Setup (first time)

### Docker path
```bash
git clone <repo>
cd idrive
make docker-image      # ~3 min — pulls JDK 17 + Android SDK + Gradle
make docker-wrapper    # generates ./gradlew once
```

### Host path
```bash
git clone <repo>
cd idrive
gradle wrapper --gradle-version 8.7   # one-time bootstrap
make init                             # creates local.properties, keystore/, out/
```

`make init` creates:
- `local.properties` (with `sdk.dir`)
- `signing.local.properties` (template copied from `config/signing.example.properties`)
- `keystore/`, `out/`, `out/dist/` directories

---

## 3. Debug Build & Install

### Docker
```bash
make docker-build-debug   # → out/KidsRides-debug.apk
```
*(No device install inside Docker; copy the APK out and `adb install` from host, or use the host path below.)*

### Host
```bash
make build-debug          # → out/KidsRides-debug.apk (copied from app/build/outputs/apk/debug/)
make install-debug        # adb install
make logcat               # stream logs filtered to the app
```

Debug builds use mock Google adapters (`BuildConfig.USE_MOCK_GOOGLE = true`).

---

## 4. Running Tests

### Unit tests (JVM only — no device required)

```bash
make docker-test         # runs inside container, 42 cases across 6 classes
# or
make test-unit           # host path, same target
```

Current inventory (all green as of 2026-04-18):

| Test class | Cases |
|---|---|
| `RecurrenceExpanderTest` | 7 |
| `RideAssignmentStateMachineTest` | 14 |
| `ConflictDetectorTest` | 7 |
| `ConfigParserTest` | 6 |
| `PrivateDriveDataJsonTest` | 2 |
| `MockSheetsAdapterTest` | 6 |
| **Total** | **42** |

Reports: `app/build/reports/tests/testDebugUnitTest/index.html`

### Integration & UI tests (requires device/emulator)

```bash
make emulator-start      # first available AVD
make test-integration    # connectedDebugAndroidTest
make test-ui             # UI-scoped instrumented tests
make emulator-stop
```

These are currently inventoried in `TEST_PLAN.md` but not yet implemented.

### Lint + unit tests (CI-safe, no device)

```bash
make check               # lint + test-unit
make docker-check        # same, inside container
```

---

## 5. Release Build

### Step 1 — Create keystore (first time only)
```bash
make keystore-create     # interactive; saves to keystore/release.jks (gitignored)
```
Or provide an existing keystore at `keystore/release.jks`.

### Step 2 — Configure signing

Prefer environment variables:
```bash
export KEYSTORE_STOREPASS=yourStorePassword
export KEYSTORE_KEYPASS=yourKeyPassword
```

Or `signing.local.properties` (gitignored):
```properties
keystorePath=keystore/release.jks
keystoreAlias=idrive
storePassword=yourStorePassword
keyPassword=yourKeyPassword
```

### Step 3 — Build release APK
```bash
make build-release       # → out/KidsRides-release-unsigned.apk
```

### Step 4 — Sign
```bash
make sign-release        # zipalign + apksigner → out/KidsRides-release.apk
```

### Step 5 — Verify
```bash
make verify-signature
```

### Step 6 — Package
```bash
make dist                # → out/dist/ (signed APK + docs)
```

---

## 6. Artifact Layout

```
out/
├── KidsRides-debug.apk                    ← make build-debug
├── KidsRides-release-unsigned.apk         ← make build-release
├── KidsRides-release.apk                  ← make sign-release
├── KidsRides-release.aab                  ← make bundle-release (optional)
└── dist/                                  ← make dist
    ├── KidsRides-release.apk
    └── docs/
        ├── README.md
        ├── ARCHITECTURE.md
        └── …
```

`out/` is gitignored. `make deep-clean` removes it entirely.

---

## 7. Sideload Install (no Google Play)

### Via USB
1. Enable Developer Options on device: Settings → About → tap Build Number 7×
2. Enable USB Debugging
3. Connect USB
4. `make adb-devices` — confirm device listed
5. `make install-release`

### Via file transfer (manual)
1. `make dist` — APK is in `out/dist/`
2. Copy `out/dist/KidsRides-release.apk` to device
3. On device: tap APK → install (may require "Install unknown apps" permission)

### Via ADB over TCP
```bash
adb tcpip 5555
adb connect <device-ip>:5555
make install-release
```

---

## 8. Signing Security

Never commit:
- `keystore/*.jks`
- `local.properties`
- `signing.local.properties`
- `app/google-services.json`

Verify they're ignored:
```bash
git check-ignore -v keystore/release.jks signing.local.properties
```

Store keystore backups in a password manager or encrypted cloud.

---

## 9. Google Services Setup (Phase 4 / real integration)

1. Create Google Cloud project at console.cloud.google.com
2. Enable APIs: Google Drive API, Google Sheets API
3. Create OAuth 2.0 credentials for Android app (SHA-1 of signing cert + package `i.drive.kids`)
4. Download `google-services.json` → place in `app/`
5. Flip the build flag: set `USE_MOCK_GOOGLE = false` (either in a release build or via `local.properties`)
6. Rebuild

SHA-1 of debug keystore:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey \
  -storepass android -keypass android | grep SHA1
```

SHA-1 of release keystore:
```bash
keytool -list -v -keystore keystore/release.jks -alias idrive | grep SHA1
```

---

## 10. Version Management

Edit `local.properties`:
```properties
versionName=1.0.1
versionCode=2
```

`versionCode` must be incremented for every release.

---

## 11. Operational Flows Summary

### Debug flow (Docker)
```bash
make docker-image && make docker-wrapper
make docker-build-debug
# then host-side: adb install out/KidsRides-debug.apk
```

### Debug flow (host)
```bash
make doctor && make init && make build-debug && make install-debug && make logcat
```

### Release flow
```bash
make doctor
make keystore-create      # first time only
make build-release
make sign-release
make verify-signature
make dist
```

### Test flow
```bash
make docker-test          # fastest — 42 unit tests in ~30s
# full device-based suite
make lint && make test-unit && make emulator-start \
    && make test-integration && make test-ui && make emulator-stop
```

---

## 12. Docker Internals

The build image (`Dockerfile`) includes:
- `eclipse-temurin:17-jdk-jammy`
- Android cmdline-tools `11076708`
- `platforms;android-34`, `platforms;android-35`
- `build-tools;34.0.0`, `build-tools;35.0.0`
- `platform-tools` (adb)
- Gradle 8.7
- `make`, `git`, `curl`, `unzip`

Run flags used by `make docker-*`:
- `--user $(id -u):$(id -g)` so files written to the mounted workspace stay owned by the host user (important for rootless Docker)
- `-e HOME=/workspace/.docker-home` so AGP's `~/.android` analytics file is writable
- `-e GRADLE_USER_HOME=/workspace/.gradle-docker` so the Gradle cache persists between runs but is isolated from your host's `~/.gradle`

Both `.docker-home/` and `.gradle-docker/` are gitignored.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Plugin … was not found` for Hilt | Plugin version pruned from Maven Central | Bump `hilt` in `gradle/libs.versions.toml` |
| `resource mipmap/ic_launcher not found` | Missing launcher drawable | See `app/src/main/res/mipmap-anydpi-v26/` |
| `Could not initialize native services` (Gradle) | Running as uid 0 against uid-mapped bind mount | Use `make docker-*` targets (they set `--user`) |
| `SDK directory is not writable` | AGP auto-provisioning a missing build-tools version | Install the version into the Dockerfile or locally |
| `META-INF/INDEX.LIST` merge conflict | Duplicate resources in Google API jars | Already excluded in `app/build.gradle.kts` |
| `SwipeToDismiss` unresolved | Material 3 ≥1.2 renamed to `SwipeToDismissBox` | Use `rememberSwipeToDismissBoxState` |
