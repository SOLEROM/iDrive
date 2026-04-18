# INSTALL — New Ubuntu host setup

Get a fresh **Ubuntu 22.04 or 24.04** machine from zero to **building,
testing, and installing** the Kids Rides & Classes Manager Android app.

Works on native Ubuntu and on Ubuntu under WSL2. Not tested anywhere else.

Two supported paths. **Docker is recommended** — one command, no local Android
SDK. Pick the host path only if you need to run on a device/emulator from the
same machine that builds.

---

## 0. TL;DR — just run the script

From the repo root on a fresh Ubuntu host:

```bash
./install.sh              # host toolchain (JDK + Android SDK + Gradle)
./install.sh --docker     # Docker path only
./install.sh --emulator   # host toolchain + Android emulator + AVD
./install.sh --all        # host + docker + emulator
```

The script is idempotent. Re-run it any time — it skips what's already
installed. Everything below documents what it does, for when you want to do
it by hand or debug a failure.

---

## 1. Pick your path

| You want to… | Use |
|---|---|
| Build APK + run the 42 unit tests only | **Docker** |
| Install on a USB-connected phone / run emulator / integration tests | **Host toolchain** (adb has to live on the host) |
| Run the app on an emulator (no physical device) | **Host toolchain** + `--emulator` |
| Everything | `./install.sh --all` |

---

## 2. Docker path (recommended)

### 2.1 Install Docker

```bash
sudo apt-get update
sudo apt-get install -y docker.io make git
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"     # allow rootless docker — log out/in after
docker --version                    # sanity check (after re-login)
```

Disk: reserve **~3 GB** for the image + Gradle cache.

### 2.2 Clone + bootstrap

```bash
git clone <repo-url> idrive
cd idrive

make docker-image      # ~3 min — builds idrive-build:latest (JDK 17 + Android SDK 34/35 + Gradle 8.7)
make docker-wrapper    # generates ./gradlew once (persists in the repo)
```

### 2.3 Sanity check

```bash
make docker-test       # runs 42 JVM unit tests — expect BUILD SUCCESSFUL
```

### 2.4 Day-to-day

```bash
make docker-build-debug    # → out/KidsRides-debug.apk
make docker-check          # lint + unit tests
make docker-shell          # interactive bash inside the container
```

To install the APK on a device, copy it to a host with `adb` and run
`adb install out/KidsRides-debug.apk`, or use the host path below.

---

## 3. Host toolchain path

Needed if you want `adb install`, logcat, emulator, or instrumented tests from
this machine.

### 3.1 Install base packages

```bash
sudo apt-get update
sudo apt-get install -y make git curl unzip ca-certificates
```

### 3.2 Install JDK 17

```bash
sudo apt-get install -y openjdk-17-jdk-headless
java -version         # expect: openjdk version "17.x.x"
```

### 3.3 Install Android SDK (command-line only, no Android Studio required)

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"
cd "$ANDROID_HOME/cmdline-tools"

curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
    -o tools.zip
unzip -q tools.zip && mv cmdline-tools latest && rm tools.zip
```

Append to `~/.bashrc` (or `~/.zshrc` if you use zsh):

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Reload: `source ~/.bashrc`.

### 3.4 Accept licenses + install SDK packages

Exact versions — do not substitute (they match `gradle/libs.versions.toml` and
the Dockerfile):

```bash
yes | sdkmanager --licenses
sdkmanager \
  "platform-tools" \
  "platforms;android-34" \
  "platforms;android-35" \
  "build-tools;34.0.0" \
  "build-tools;35.0.0"
```

Emulator support is documented separately in **§4** below (or just run
`./install.sh --emulator` to install it as part of setup).

### 3.5 Install Gradle 8.7 (one-time bootstrap of `./gradlew`)

```bash
curl -fsSL https://services.gradle.org/distributions/gradle-8.7-bin.zip -o /tmp/gradle.zip
mkdir -p "$HOME/.local/gradle"
unzip -q /tmp/gradle.zip -d "$HOME/.local/gradle"
ln -sfn "$HOME/.local/gradle/gradle-8.7" "$HOME/.local/gradle/current"
rm /tmp/gradle.zip
```

Append to `~/.bashrc`:

```bash
export PATH="$HOME/.local/gradle/current/bin:$PATH"
```

Then `source ~/.bashrc && gradle --version` — expect `Gradle 8.7`.

### 3.6 Clone + initialise the project

```bash
git clone <repo-url> idrive
cd idrive

gradle wrapper --gradle-version 8.7    # one-time: creates ./gradlew
make doctor                            # verifies java, adb, sdk, gradle
make init                              # creates local.properties, keystore/, out/
```

### 3.7 Sanity check

```bash
make test-unit         # 42 unit tests — BUILD SUCCESSFUL expected
make build-debug       # → out/KidsRides-debug.apk
```

### 3.8 Enable device install (optional)

On your Android phone:
1. Settings → About → tap **Build Number** 7 times to unlock developer options
2. Settings → Developer options → enable **USB debugging**
3. Plug the phone in; tap **Allow** on the RSA prompt
4. Back on the host: `make adb-devices` (must list the device)
5. `make install-debug && make logcat`

---

## 4. Android emulator (optional)

Lets you debug and test the app without a physical phone. The Makefile
already has the run-side targets (`emulator-start`, `emulator-stop`); this
section is about the one-time install.

### 4.1 One-shot install

```bash
./install.sh --emulator
```

This does everything below automatically:
- Installs `qemu-kvm` + adds you to the `kvm` group (hardware acceleration)
- `sdkmanager` installs `emulator` and `system-images;android-35;google_apis;$arch`
  (~1 GB download; `$arch` is `x86_64` or `arm64-v8a` based on your host)
- `avdmanager` creates an AVD named `idrive-test` using the Pixel 7 profile

### 4.2 Manual install

```bash
sudo apt-get install -y qemu-kvm libvirt-clients libvirt-daemon-system bridge-utils
sudo usermod -aG kvm "$USER"     # log out/in afterwards

# x86_64 host:
sdkmanager "emulator" "system-images;android-35;google_apis;x86_64"
avdmanager create avd -n idrive-test -k "system-images;android-35;google_apis;x86_64" -d pixel_7

# arm64 host (e.g. Ampere, Raspberry Pi, cloud ARM VM):
sdkmanager "emulator" "system-images;android-35;google_apis;arm64-v8a"
avdmanager create avd -n idrive-test -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_7
```

### 4.3 Hardware acceleration prerequisites

For anything other than a crawl, the host needs KVM:

```bash
ls -l /dev/kvm                   # exists and readable by your user?
egrep -c '(vmx|svm)' /proc/cpuinfo   # >0 means CPU supports virtualization
```

If `/dev/kvm` is missing:
- **Bare metal**: enable `VT-x` (Intel) or `AMD-V` / `SVM` in BIOS/UEFI
- **Inside a VM**: enable nested virtualization on the hypervisor (VMware → *Virtualize Intel VT-x/EPT*; VirtualBox → `VBoxManage modifyvm <vm> --nested-hw-virt on`; Proxmox → `cpu: host`)
- **WSL2 on Windows**: emulator works on Windows 11 with Hyper-V + WSLg, but it's simpler to run the emulator on the Windows host (via Android Studio) and `adb connect` into it from WSL

### 4.4 Running the emulator

```bash
make emulator-list     # sanity check — should list "idrive-test"
make emulator-start    # starts first available AVD in the background
make adb-devices       # confirm "emulator-5554  device"
make install-debug     # build + install the debug APK onto it
make logcat            # stream app logs
make emulator-stop     # kill the emulator
```

Direct invocation (if you need non-default flags — GPU, memory, cold boot):

```bash
emulator -avd idrive-test -no-snapshot -gpu swiftshader_indirect
```

### 4.5 Headless / CI mode

For running instrumented tests without a window:

```bash
emulator -avd idrive-test -no-window -no-audio -no-snapshot -no-boot-anim &
adb wait-for-device
make test-integration
make emulator-stop
```

---

## 5. Project configuration (both paths)

These files are **gitignored** — create them locally.

### `local.properties` (auto-created by `make init`)

```properties
sdk.dir=/home/you/Android/Sdk
# versionName=1.0.0   # optional override
# versionCode=1
```

### `signing.local.properties` (only when you sign a release)

```properties
keystorePath=keystore/release.jks
keystoreAlias=idrive
storePassword=yourStorePassword
keyPassword=yourKeyPassword
```

Or export env vars instead:

```bash
export KEYSTORE_STOREPASS=yourStorePassword
export KEYSTORE_KEYPASS=yourKeyPassword
```

Create the keystore once: `make keystore-create` (interactive).

### Google services (Phase 4 — real Drive/Sheets integration)

Not required today — debug builds use in-memory mocks
(`BuildConfig.USE_MOCK_GOOGLE = true`). When Phase 4 lands:

1. Create a Google Cloud project; enable Drive API + Sheets API
2. Create OAuth 2.0 Android credentials (package `i.drive.kids`, SHA-1 of your signing cert)
3. Drop `google-services.json` into `app/` (it's gitignored)
4. Flip `USE_MOCK_GOOGLE = false` and rebuild

SHA-1 of debug keystore:

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

---

## 6. Verify everything works

From the repo root — should end with `BUILD SUCCESSFUL` and 42 tests passing:

```bash
make docker-test       # docker path
make test-unit         # host path
```

If this fails on a clean checkout, something in your environment drifted.
Check `CLAUDE.md` §8 ("Things that will bite you") before debugging.

---

## 7. Common flows

```bash
# Debug (Docker)
make docker-build-debug
adb install out/KidsRides-debug.apk        # from a host with adb

# Debug (host)
make build-debug && make install-debug && make logcat

# Debug on emulator
make emulator-start && make install-debug && make logcat

# Release
make keystore-create                       # first time only
make build-release && make sign-release && make verify-signature && make dist

# Full test sweep
make lint && make test-unit && make check
```

All Make targets: `make help`.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `docker: permission denied` | Log out/in after `usermod -aG docker $USER`, or Docker daemon isn't running (`sudo systemctl start docker`) |
| `Could not initialize native services` (Gradle, inside Docker) | Use `make docker-*` targets — they set `--user` |
| `Plugin 'com.google.dagger.hilt.android' … not found` | Bump Hilt in `gradle/libs.versions.toml` (Maven Central prunes old releases) |
| `resource mipmap/ic_launcher not found` | Adaptive-icon files deleted — restore under `app/src/main/res/mipmap-anydpi-v26/` |
| `SwipeToDismiss` / `rememberDismissState` unresolved | Migrate to `SwipeToDismissBox` + `rememberSwipeToDismissBoxState` |
| `adb: no devices` | USB debugging off, RSA prompt not accepted, or cable is charge-only |
| `sdkmanager: command not found` | `PATH` doesn't include `$ANDROID_HOME/cmdline-tools/latest/bin` — re-source `~/.bashrc` |
| `E: Unable to locate package openjdk-17-jdk-headless` | Ubuntu < 22.04 — upgrade, or enable `universe` repo |
| `apt-get update` warns about `EXPKEYSIG` / "doesn't have the component" | Unrelated third-party PPA in `/etc/apt/sources.list.d/` (e.g. `syncthing`, `warp`) is broken. `install.sh` tolerates this and continues. To silence: `ls /etc/apt/sources.list.d/` and remove or fix the offending file |
| `adb server version (N) doesn't match this client (M); killing...` | Ubuntu's `adb` apt package conflicts with the SDK one. Fix: `sudo apt-get remove -y adb android-tools-adb` — the SDK `platform-tools/adb` takes over. `install.sh` now removes it automatically |
| Emulator: `KVM is required to run this AVD` / `/dev/kvm is not found` | Host virtualization disabled. Enable VT-x/AMD-V in BIOS; in a VM, enable nested virtualization. After `usermod -aG kvm`, log out/in |
| Emulator: `Cannot find AVD system path` | System image wasn't installed. Re-run `sdkmanager "system-images;android-35;google_apis;x86_64"` (or `arm64-v8a`) and recreate the AVD |
| Emulator: stuck on black screen / boot loop | `emulator -avd idrive-test -no-snapshot -wipe-data` to reset. Or `-gpu swiftshader_indirect` if host GPU drivers are flaky |
| `make emulator-start`: no AVD found | Re-run `./install.sh --emulator`, or manually: `avdmanager create avd -n idrive-test -k "system-images;android-35;google_apis;x86_64"` |

Full troubleshooting table: `BUILD_AND_RELEASE.md` §13.

---

## 9. What you get after install

- `./gradlew` — pinned Gradle 8.7 wrapper
- `$HOME/Android/Sdk` — Android SDK with platforms 34/35 and build-tools 34.0.0/35.0.0
- `$HOME/.local/gradle/current` → `gradle-8.7`
- `out/` — final build artifacts (APKs, AABs, dist bundles); gitignored
- `keystore/` — release keystore location; gitignored
- `local.properties`, `signing.local.properties` — your local config; gitignored
- `.gradle-docker/`, `.docker-home/` — Docker-scoped Gradle cache; gitignored

Safe to delete any of the above and re-run `./install.sh` (or the relevant
`make` target) to regenerate.
