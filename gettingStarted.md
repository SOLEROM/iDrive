# Getting Started

A developer onboarding guide — from a fresh Ubuntu host to building, testing,
emulating, and deploying the Kids Rides & Classes Manager app.

**Audience:** developers joining the project. If you just want to run the app
on your phone, the fastest path is §1 → §3 → §5 below.

---

## 0. What you'll need

- **Ubuntu 22.04 or 24.04** (bare metal, VM, or WSL2)
- ~10 GB free disk (Android SDK, emulator system image, Gradle cache)
- Network access for first-time downloads
- A phone **or** a host that supports hardware virtualization (for the emulator)

Other OSes aren't supported by the install script. macOS/Windows dev is
possible via Docker (see §2), but device install and emulator must run from
a platform that has `adb` locally.

---

## 1. Install the toolchain

One command sets everything up:

```bash
./install.sh              # JDK 17 + Android SDK + Gradle (minimum for build+test)
./install.sh --emulator   # above + emulator + pre-made AVD
./install.sh --docker     # Docker path only (no host SDK)
./install.sh --all        # host + docker + emulator
```

The script is idempotent — safe to re-run any time.

After it finishes, open a **new shell** (or `source ~/.bashrc`) so the
env exports take effect. Then verify:

```bash
make doctor               # java, adb, sdk, gradle — all ticked?
make test-unit            # 42 unit tests pass
```

Full manual instructions: **[`install.md`](./install.md)**.

---

## 2. Build

### Debug APK (mock Google adapters, ~20s rebuild)

```bash
make build-debug          # → out/KidsRides-debug.apk
```

Debug builds use `BuildConfig.USE_MOCK_GOOGLE = true` — no Google credentials
needed; Drive and Sheets are in-memory fakes with seed data.

### Release APK (requires signing — see §6)

```bash
make build-release        # → out/KidsRides-release-unsigned.apk
```

### Docker build (reproducible, no host SDK)

```bash
make docker-image         # one-time — builds the reproducible env (~3 min)
make docker-wrapper       # generates ./gradlew inside the container
make docker-build-debug   # → out/KidsRides-debug.apk
```

All final artifacts land in `out/` (gitignored). Gradle intermediates go to
`app/build/`.

---

## 3. Test

### Unit tests (JVM, no device needed)

```bash
make test-unit            # 42 cases across 6 classes (~30s)
make docker-test          # same, inside the Docker env
```

Current test inventory:

| Class | Cases |
|---|---|
| `RecurrenceExpanderTest` | 7 |
| `RideAssignmentStateMachineTest` | 14 |
| `ConflictDetectorTest` | 7 |
| `ConfigParserTest` | 6 |
| `PrivateDriveDataJsonTest` | 2 |
| `MockSheetsAdapterTest` | 6 |

Reports: `app/build/reports/tests/testDebugUnitTest/index.html`.

### Lint + unit tests (CI-safe)

```bash
make check                # lint + test-unit
make docker-check         # same, inside Docker
```

### Integration + UI tests (requires device or emulator)

These are inventoried in `TEST_PLAN.md` but **not yet implemented**. The
Gradle/Make targets exist for when they land:

```bash
make test-integration     # connectedDebugAndroidTest
make test-ui              # UI-scoped instrumented tests
```

Write tests first (TDD) for any new domain logic. See `tdd-workflow` skill
and `TEST_PLAN.md` for the conventions.

---

## 4. Run on a real device

### Prep the device

1. Settings → About → tap **Build Number** 7× to unlock developer options
2. Developer options → enable **USB debugging**
3. Plug in via USB and tap **Allow** on the RSA prompt

### Install + watch logs

```bash
make adb-devices          # confirm the device is listed
make install-debug        # build + install the debug APK
make logcat               # stream app logs
```

Uninstall with `make uninstall`.

### Wireless (ADB over TCP)

```bash
adb tcpip 5555
adb connect <device-ip>:5555
make install-debug
```

---

## 5. Run on an emulator

If you don't have a physical device (or want CI-style testing), the emulator
is the next-best option.

### First time

```bash
./install.sh --emulator   # installs qemu-kvm, system image, creates AVD "idrive-test"
```

This needs hardware virtualization (`/dev/kvm`). On bare metal, enable
VT-x/AMD-V in BIOS. In a VM, enable nested virtualization. If the script
warns about `/dev/kvm` the emulator will still work — just slowly.

### Everyday use

```bash
make emulator-list        # should show: idrive-test
make emulator-start       # boot in the background
make adb-devices          # wait until "emulator-5554  device"
make install-debug        # install the app
make logcat               # watch logs
# … test stuff …
make emulator-stop
```

### Headless (CI-style)

```bash
emulator -avd idrive-test -no-window -no-audio -no-snapshot -no-boot-anim &
adb wait-for-device
make test-integration
make emulator-stop
```

### Direct invocation (custom flags)

```bash
emulator -avd idrive-test -no-snapshot -gpu swiftshader_indirect
```

Full emulator setup reference: `install.md` §4.

---

## 6. Deploy (signed release)

### One-time: create a keystore

```bash
make keystore-create      # interactive — writes keystore/release.jks (gitignored)
```

Back it up in a password manager. If you lose it you cannot ship updates to
anyone who installed a previous signed build.

### Configure signing

Either export env vars:

```bash
export KEYSTORE_STOREPASS=yourStorePassword
export KEYSTORE_KEYPASS=yourKeyPassword
```

Or edit `signing.local.properties` (gitignored; template copied by `make init`).

### Build + sign + verify

```bash
make build-release        # → out/KidsRides-release-unsigned.apk
make sign-release         # → out/KidsRides-release.apk
make verify-signature     # apksigner verify
```

### Package for distribution

```bash
make dist                 # → out/dist/ with signed APK + key docs
```

### Sideload on a device

- **USB**: `make install-release` (device needs "Install unknown apps" permission)
- **Manual**: copy `out/dist/KidsRides-release.apk` to the device and tap it
- **Over TCP**: `adb tcpip 5555 && adb connect <ip>:5555 && make install-release`

Full release reference: `BUILD_AND_RELEASE.md` §5 + §7.

---

## 7. Real Google Drive / Sheets (Phase 4)

Debug builds ship with mock adapters. To use the real APIs:

1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Google Drive API** and **Google Sheets API**
3. Create **OAuth 2.0 Android credentials** (package `i.drive.kids`, SHA-1 of your signing cert)
4. Download `google-services.json` → drop into `app/` (gitignored)
5. Flip `USE_MOCK_GOOGLE = false` (release build, or `local.properties` override)
6. Rebuild

Get the debug-keystore SHA-1:

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

Release-keystore SHA-1:

```bash
keytool -list -v -keystore keystore/release.jks -alias idrive | grep SHA1
```

Phase 4 adapter code lives in `data/remote/google/` (not yet implemented).

---

## 8. Typical workflows

### Work on a feature

```bash
# TDD: write a failing unit test first
vim app/src/test/java/i/drive/kids/...
make test-unit                    # expect RED

# Implement
vim app/src/main/java/i/drive/kids/...
make test-unit                    # expect GREEN
make check                        # lint clean?

# Run it on a device or emulator
make emulator-start               # or plug in a phone
make install-debug
make logcat
```

### Ship a release

```bash
# Assumes keystore + signing config already set up
make build-release
make sign-release
make verify-signature
make dist
# out/dist/KidsRides-release.apk is ready to share
```

### Debug a sync issue

```bash
make install-debug
make logcat                       # filters to the app tag
# reproduce the issue; look for SyncEngine / ConflictDetector lines
```

### Wipe and start clean

```bash
make deep-clean                   # removes out/, .gradle, app/build/
rm -rf .gradle-docker .docker-home   # if you use Docker
./install.sh --skip-sanity        # reinstall / repair tools
make test-unit                    # confirm still green
```

---

## 9. Things that will bite you

Pulled from `CLAUDE.md` §8 — read that file before debugging a build:

| Symptom | Cause |
|---|---|
| `Plugin 'com.google.dagger.hilt.android' not found` | Hilt version pruned from Maven Central — bump `hilt` in `gradle/libs.versions.toml` |
| `resource mipmap/ic_launcher not found` | Adaptive-icon files got deleted — restore `app/src/main/res/mipmap-anydpi-v26/` |
| `Could not initialize native services` (Gradle inside Docker) | Use `make docker-*` targets — they set `--user` |
| `SwipeToDismiss` / `rememberDismissState` unresolved | Material 3 ≥ 1.2 renamed the API — use `SwipeToDismissBox` |
| Emulator: `KVM is required to run this AVD` | Enable VT-x/AMD-V in BIOS, or nested virt in the VM |
| `MockSheetsAdapter` overwrites your writes | Writes must call `seededSheets.add(sheetId)` — already fixed, watch for regressions |

Full troubleshooting tables live in `BUILD_AND_RELEASE.md` §13 and
`install.md` §8.

---

## 10. Where to go next

- **Make a small change**: pick a screen under `app/src/main/java/i/drive/kids/ui/screen/` and run it on the emulator
- **Read the contracts**: `DATA_MODEL.md` + `SYNC_DESIGN.md` before touching
  storage or sync code
- **Know the tests**: `app/src/test/` is the executable spec — the 42 cases
  document how things are *meant* to behave
- **Check the roadmap**: `CLAUDE.md` §7 lists what's done, partial, and
  pending

All Make targets: `make help`.
