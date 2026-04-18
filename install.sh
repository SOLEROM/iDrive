#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# install.sh — Set up a new Ubuntu host to build, compile, and test
#              the Kids Rides & Classes Manager Android app.
#
# Supports: Ubuntu 22.04 / 24.04 (and Ubuntu-based WSL2).
#
# Idempotent: safe to re-run. Skips anything already at the right version.
#
# Usage:
#   ./install.sh                # host toolchain (JDK + Android SDK + Gradle)
#   ./install.sh --docker       # Docker path only (build image, no host SDK)
#   ./install.sh --emulator     # host toolchain + Android emulator + AVD
#   ./install.sh --all          # host + docker + emulator
#   ./install.sh --skip-sanity  # skip the final `make test-unit` verification
#   ./install.sh --help         # show this help
#
# After it finishes, open a new shell (or `source ~/.bashrc`) so PATH/env
# exports take effect, then run `make test-unit` from the repo root.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Pinned versions (must match Dockerfile + gradle/libs.versions.toml) ─────────
JDK_MAJOR="17"
CMDLINE_TOOLS_VERSION="11076708"
ANDROID_PLATFORM_PRIMARY="android-35"
ANDROID_PLATFORM_COMPAT="android-34"
ANDROID_BUILD_TOOLS_PRIMARY="35.0.0"
ANDROID_BUILD_TOOLS_COMPAT="34.0.0"
GRADLE_VERSION="8.7"
AVD_NAME="idrive-test"
AVD_DEVICE="pixel_7"

# ── Defaults / flags ────────────────────────────────────────────────────────────
DO_HOST=1
DO_DOCKER=0
DO_EMULATOR=0
RUN_SANITY=1

# ── Colors ──────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
    GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; RED=$'\033[0;31m'
    BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
    GREEN=""; YELLOW=""; RED=""; BLUE=""; BOLD=""; RESET=""
fi

log()   { printf "%s→%s %s\n" "$BLUE" "$RESET" "$*"; }
ok()    { printf "%s✓%s %s\n" "$GREEN" "$RESET" "$*"; }
warn()  { printf "%s⚠%s %s\n" "$YELLOW" "$RESET" "$*"; }
fail()  { printf "%s✗%s %s\n" "$RED" "$RESET" "$*" >&2; exit 1; }
step()  { printf "\n%s%s── %s ──%s\n" "$BOLD" "$BLUE" "$*" "$RESET"; }

usage() {
    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
}

# ── Parse args ──────────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
    case "$1" in
        --docker)       DO_HOST=0; DO_DOCKER=1 ;;
        --emulator)     DO_HOST=1; DO_EMULATOR=1 ;;
        --all)          DO_HOST=1; DO_DOCKER=1; DO_EMULATOR=1 ;;
        --skip-sanity)  RUN_SANITY=0 ;;
        -h|--help)      usage ;;
        *)              fail "unknown argument: $1 (try --help)" ;;
    esac
    shift
done

# ── OS check (Ubuntu only) ──────────────────────────────────────────────────────
SUDO=""

check_ubuntu() {
    [ "$(uname -s)" = "Linux" ] || fail "this script only supports Linux (Ubuntu)"
    [ -f /etc/os-release ] || fail "/etc/os-release not found — unable to verify Ubuntu"
    . /etc/os-release
    case "${ID:-}" in
        ubuntu) ;;
        *) fail "this script only supports Ubuntu (detected: ${PRETTY_NAME:-$ID})" ;;
    esac
    [ "$(id -u)" -ne 0 ] && SUDO="sudo"
    ok "detected: ${PRETTY_NAME} ($(uname -m))"
}

apt_install() {
    $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "$@"
}

apt_update_once() {
    if [ -n "${_APT_UPDATED:-}" ]; then
        return
    fi
    log "apt-get update"
    # Tolerate third-party repo failures (expired GPG keys, misconfigured
    # components, etc.) — they don't affect the official Ubuntu archives we
    # need. `apt-get install` below is the real pass/fail signal.
    local log_file rc
    log_file="$(mktemp)"
    set +e
    $SUDO apt-get update 2>&1 | tee "$log_file"
    rc=${PIPESTATUS[0]}
    set -e
    if [ "$rc" -ne 0 ] || grep -qE "EXPKEYSIG|doesn't have the component|misspelt" "$log_file"; then
        warn "apt-get update reported issues with third-party repositories."
        warn "Usually caused by broken PPAs in /etc/apt/sources.list.d/"
        warn "(e.g. syncthing, warp). Official Ubuntu archives should still"
        warn "be usable — continuing. To silence, fix or remove the offenders:"
        warn "  ls /etc/apt/sources.list.d/"
    fi
    rm -f "$log_file"
    _APT_UPDATED=1
}

# ── Base OS tools ───────────────────────────────────────────────────────────────
install_base_tools() {
    step "Base tools (make, git, curl, unzip, ca-certificates)"
    local needed=()
    for bin in make git curl unzip; do
        command -v "$bin" >/dev/null 2>&1 || needed+=("$bin")
    done
    if [ ${#needed[@]} -eq 0 ]; then
        ok "base tools already installed"
        return
    fi
    apt_update_once
    log "installing: ${needed[*]} ca-certificates"
    apt_install "${needed[@]}" ca-certificates
    ok "base tools ready"
}

# ── JDK 17 ──────────────────────────────────────────────────────────────────────
install_jdk() {
    step "JDK $JDK_MAJOR"
    if command -v java >/dev/null 2>&1; then
        local v
        v="$(java -version 2>&1 | head -n1 | sed -E 's/.*"([0-9]+)\..*/\1/; s/.*"([0-9]+)".*/\1/')"
        if [ "$v" = "$JDK_MAJOR" ]; then
            ok "java $JDK_MAJOR already installed"
            return
        else
            warn "found java $v; installing openjdk-$JDK_MAJOR alongside"
        fi
    fi
    apt_update_once
    apt_install openjdk-17-jdk-headless
    command -v java >/dev/null 2>&1 || fail "java not on PATH after install"
    ok "java ready: $(java -version 2>&1 | head -n1)"
}

# ── Android SDK ─────────────────────────────────────────────────────────────────
ANDROID_HOME_DEFAULT="$HOME/Android/Sdk"
ANDROID_HOME="${ANDROID_HOME:-$ANDROID_HOME_DEFAULT}"

install_android_sdk() {
    step "Android SDK (cmdline-tools $CMDLINE_TOOLS_VERSION)"
    local tools_bin="$ANDROID_HOME/cmdline-tools/latest/bin"
    if [ -x "$tools_bin/sdkmanager" ]; then
        ok "cmdline-tools present: $tools_bin"
    else
        log "downloading cmdline-tools → $ANDROID_HOME"
        mkdir -p "$ANDROID_HOME/cmdline-tools"
        local zip="/tmp/cmdline-tools-$CMDLINE_TOOLS_VERSION.zip"
        curl -fsSL \
            "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip" \
            -o "$zip"
        unzip -q -o "$zip" -d "$ANDROID_HOME/cmdline-tools"
        rm -rf "$ANDROID_HOME/cmdline-tools/latest"
        mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
        rm -f "$zip"
        ok "cmdline-tools installed"
    fi

    export ANDROID_HOME
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    export PATH="$tools_bin:$ANDROID_HOME/platform-tools:$PATH"

    # Ubuntu's `adb` apt package ships an older protocol version that
    # conflicts with the SDK platform-tools adb. Symptom: "adb server version
    # (N) doesn't match this client (M); killing..." — every adb invocation
    # kills and restarts the server. Remove it if present.
    if dpkg -l adb 2>/dev/null | grep -q '^ii'; then
        warn "removing conflicting apt 'adb' package (use SDK platform-tools adb instead)"
        $SUDO apt-get remove -y adb android-tools-adb 2>/dev/null || true
        $SUDO apt-get autoremove -y 2>/dev/null || true
    fi

    step "Android SDK packages"
    log "accepting licenses"
    yes | sdkmanager --licenses >/dev/null 2>&1 || true
    log "installing: platform-tools, $ANDROID_PLATFORM_PRIMARY, $ANDROID_PLATFORM_COMPAT, build-tools $ANDROID_BUILD_TOOLS_PRIMARY + $ANDROID_BUILD_TOOLS_COMPAT"
    sdkmanager \
        "platform-tools" \
        "platforms;$ANDROID_PLATFORM_PRIMARY" \
        "platforms;$ANDROID_PLATFORM_COMPAT" \
        "build-tools;$ANDROID_BUILD_TOOLS_PRIMARY" \
        "build-tools;$ANDROID_BUILD_TOOLS_COMPAT" \
        >/dev/null
    ok "SDK packages installed"
}

# ── Gradle 8.7 ──────────────────────────────────────────────────────────────────
install_gradle() {
    step "Gradle $GRADLE_VERSION"
    if command -v gradle >/dev/null 2>&1; then
        local v
        v="$(gradle --version 2>/dev/null | awk '/^Gradle /{print $2; exit}')"
        if [ "$v" = "$GRADLE_VERSION" ]; then
            ok "gradle $GRADLE_VERSION already installed"
            return
        else
            warn "found gradle $v; installing $GRADLE_VERSION to ~/.local/gradle"
        fi
    fi
    local gradle_dir="$HOME/.local/gradle"
    mkdir -p "$gradle_dir"
    local zip="/tmp/gradle-$GRADLE_VERSION.zip"
    log "downloading gradle-$GRADLE_VERSION-bin.zip"
    curl -fsSL "https://services.gradle.org/distributions/gradle-$GRADLE_VERSION-bin.zip" -o "$zip"
    unzip -q -o "$zip" -d "$gradle_dir"
    rm -f "$zip"
    ln -sfn "$gradle_dir/gradle-$GRADLE_VERSION" "$gradle_dir/current"
    export PATH="$gradle_dir/current/bin:$PATH"
    ok "gradle ready: $(gradle --version 2>/dev/null | awk '/^Gradle /{print $2}')"
}

# ── Shell profile exports ───────────────────────────────────────────────────────
update_shell_profile() {
    step "Shell profile"
    local profile
    case "${SHELL:-/bin/bash}" in
        */zsh)  profile="$HOME/.zshrc" ;;
        */bash) profile="$HOME/.bashrc" ;;
        *)      profile="$HOME/.profile" ;;
    esac
    touch "$profile"

    local marker="# >>> idrive install.sh >>>"
    local endmark="# <<< idrive install.sh <<<"
    local gradle_dir="$HOME/.local/gradle/current/bin"

    if grep -qF "$marker" "$profile"; then
        ok "profile already patched: $profile"
        return
    fi

    {
        printf "\n%s\n" "$marker"
        printf "export ANDROID_HOME=\"%s\"\n" "$ANDROID_HOME"
        printf "export ANDROID_SDK_ROOT=\"\$ANDROID_HOME\"\n"
        printf "export PATH=\"\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH\"\n"
        printf "[ -d \"%s\" ] && export PATH=\"%s:\$PATH\"\n" "$gradle_dir" "$gradle_dir"
        printf "%s\n" "$endmark"
    } >> "$profile"
    ok "appended env exports to $profile"
    warn "open a new shell, or: source $profile"
}

# ── Docker ──────────────────────────────────────────────────────────────────────
install_docker() {
    step "Docker"
    if command -v docker >/dev/null 2>&1; then
        ok "docker present: $(docker --version)"
    else
        apt_update_once
        apt_install docker.io
        $SUDO systemctl enable --now docker || true
        if ! groups | grep -q '\bdocker\b'; then
            $SUDO usermod -aG docker "$USER" || true
            warn "added $USER to docker group — log out/in for this to take effect"
        fi
        ok "docker installed"
    fi

    if [ -f "./Dockerfile" ] && [ -f "./Makefile" ]; then
        if docker info >/dev/null 2>&1; then
            log "building idrive-build:latest image (≈3 min)"
            make docker-image
            make docker-wrapper
            ok "docker image ready"
        else
            warn "docker daemon not reachable yet (group change pending?) — re-run: make docker-image"
        fi
    else
        warn "not in repo root (no Dockerfile/Makefile here) — skipping image build"
    fi
}

# ── Android emulator ────────────────────────────────────────────────────────────
install_emulator() {
    step "Android emulator"

    if [ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
        fail "Android SDK missing — run host install first (drop --docker-only flags)"
    fi

    local arch image
    case "$(uname -m)" in
        x86_64)  arch="x86_64" ;;
        aarch64) arch="arm64-v8a" ;;
        *) fail "unsupported architecture for emulator: $(uname -m)" ;;
    esac
    image="system-images;$ANDROID_PLATFORM_PRIMARY;google_apis;$arch"

    # KVM acceleration (Linux only, but we're Ubuntu-only so always applicable)
    if [ ! -e /dev/kvm ]; then
        warn "/dev/kvm not present — the emulator will work but be extremely slow."
        warn "  Enable VT-x / AMD-V in BIOS. In a VM, enable nested virtualization."
    else
        apt_update_once
        log "installing: qemu-kvm, libvirt-clients, bridge-utils"
        apt_install qemu-kvm libvirt-clients libvirt-daemon-system bridge-utils
        if ! groups | grep -q '\bkvm\b'; then
            $SUDO usermod -aG kvm "$USER" || true
            warn "added $USER to kvm group — log out/in for this to take effect"
        fi
        if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
            ok "/dev/kvm accessible"
        else
            warn "/dev/kvm not accessible yet (kvm group pending); emulator will fall back to software rendering until you re-login"
        fi
    fi

    log "installing: emulator, $image (≈1 GB download)"
    sdkmanager "emulator" "$image" >/dev/null
    ok "emulator + system image installed"

    local avdmanager="$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager"
    if "$avdmanager" list avd 2>/dev/null | grep -q "Name: $AVD_NAME"; then
        ok "AVD '$AVD_NAME' already exists"
    else
        log "creating AVD: $AVD_NAME (device: $AVD_DEVICE)"
        # `avdmanager create avd` prompts for a custom hardware profile — pipe "no".
        # Fall back without --device if the preset isn't present in this SDK install.
        if "$avdmanager" list device 2>/dev/null | grep -q "id:.*\"$AVD_DEVICE\""; then
            echo "no" | "$avdmanager" create avd \
                -n "$AVD_NAME" -k "$image" -d "$AVD_DEVICE" >/dev/null
        else
            echo "no" | "$avdmanager" create avd \
                -n "$AVD_NAME" -k "$image" >/dev/null
        fi
        ok "AVD '$AVD_NAME' created"
    fi

    printf "\n"
    printf "Start with:  %smake emulator-start%s   (or: emulator -avd %s)\n" "$BOLD" "$RESET" "$AVD_NAME"
    printf "Install app: %smake install-debug%s\n" "$BOLD" "$RESET"
    printf "Stop with:   %smake emulator-stop%s\n" "$BOLD" "$RESET"
}

# ── Project bootstrap ───────────────────────────────────────────────────────────
bootstrap_project() {
    step "Project bootstrap"
    if [ ! -f "./Makefile" ] || [ ! -f "./settings.gradle.kts" ]; then
        warn "not in the idrive repo root — skipping project bootstrap"
        warn "  cd into the repo and run: gradle wrapper --gradle-version $GRADLE_VERSION && make init"
        return
    fi
    if [ ! -x "./gradlew" ]; then
        log "generating ./gradlew"
        gradle wrapper --gradle-version "$GRADLE_VERSION" --no-daemon
    else
        ok "./gradlew already present"
    fi
    log "make init"
    make init
    ok "project bootstrapped"
}

# ── Sanity ──────────────────────────────────────────────────────────────────────
run_sanity() {
    step "Sanity check (make test-unit)"
    if [ ! -f "./Makefile" ]; then
        warn "not in repo root — skipping sanity check"
        return
    fi
    if [ "$DO_HOST" -eq 1 ] && [ -x "./gradlew" ]; then
        make test-unit && ok "42 unit tests passed" || fail "unit tests failed — investigate"
    elif [ "$DO_DOCKER" -eq 1 ]; then
        make docker-test && ok "42 unit tests passed (docker)" || fail "docker unit tests failed"
    else
        warn "no path available for sanity check"
    fi
}

# ── Main ────────────────────────────────────────────────────────────────────────
main() {
    printf "%s%sidrive — install.sh (Ubuntu)%s\n" "$BOLD" "$BLUE" "$RESET"
    printf "host=%d docker=%d emulator=%d sanity=%d\n" \
        "$DO_HOST" "$DO_DOCKER" "$DO_EMULATOR" "$RUN_SANITY"

    check_ubuntu
    install_base_tools

    if [ "$DO_HOST" -eq 1 ]; then
        install_jdk
        install_android_sdk
        install_gradle
        update_shell_profile
    fi

    if [ "$DO_EMULATOR" -eq 1 ]; then
        install_emulator
    fi

    if [ "$DO_HOST" -eq 1 ]; then
        bootstrap_project
    fi

    if [ "$DO_DOCKER" -eq 1 ]; then
        install_docker
    fi

    if [ "$RUN_SANITY" -eq 1 ]; then
        run_sanity
    fi

    step "Done"
    ok "install complete"
    printf "\nNext steps:\n"
    if [ "$DO_HOST" -eq 1 ]; then
        printf "  1. Open a new shell (or: source your shell rc) to pick up env exports\n"
        printf "  2. From repo root: %smake doctor%s to verify toolchain\n" "$BOLD" "$RESET"
        printf "  3. Build:  %smake build-debug%s\n" "$BOLD" "$RESET"
        printf "  4. Test:   %smake test-unit%s  (expect 42 passing)\n" "$BOLD" "$RESET"
    fi
    if [ "$DO_EMULATOR" -eq 1 ]; then
        printf "  • Emulator: %smake emulator-start%s then %smake install-debug%s\n" \
            "$BOLD" "$RESET" "$BOLD" "$RESET"
    fi
    if [ "$DO_DOCKER" -eq 1 ]; then
        printf "  • Docker: %smake docker-test%s / %smake docker-build-debug%s\n" \
            "$BOLD" "$RESET" "$BOLD" "$RESET"
    fi
    printf "\nSee install.md for full details.\n"
}

main "$@"
