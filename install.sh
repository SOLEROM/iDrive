#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# install.sh — Set up a host to develop, test, and build the
#              Kids Rides & Classes PWA.
#
# Installs Node.js 20 (via nvm if missing) and runs `npm install`.
#
# Supports: Ubuntu 22.04 / 24.04, macOS (via Homebrew), WSL2. Works on any
# OS that has `curl` and `bash`.
#
# Idempotent: safe to re-run.
#
# Usage:
#   ./install.sh              # install toolchain + deps
#   ./install.sh --skip-deps  # toolchain only, no npm install
#   ./install.sh --skip-test  # skip the post-install sanity test
#   ./install.sh --help       # show this help
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

NODE_MAJOR="20"
SKIP_DEPS=0
SKIP_TEST=0

if [ -t 1 ]; then
    GREEN=$'\033[0;32m'; YELLOW=$'\033[0;33m'; RED=$'\033[0;31m'
    BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
    GREEN=""; YELLOW=""; RED=""; BLUE=""; BOLD=""; RESET=""
fi

log()  { printf "%s→%s %s\n" "$BLUE" "$RESET" "$*"; }
ok()   { printf "%s✓%s %s\n" "$GREEN" "$RESET" "$*"; }
warn() { printf "%s⚠%s %s\n" "$YELLOW" "$RESET" "$*"; }
fail() { printf "%s✗%s %s\n" "$RED" "$RESET" "$*" >&2; exit 1; }
step() { printf "\n%s%s── %s ──%s\n" "$BOLD" "$BLUE" "$*" "$RESET"; }

usage() { sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0; }

while [ $# -gt 0 ]; do
    case "$1" in
        --skip-deps) SKIP_DEPS=1 ;;
        --skip-test) SKIP_TEST=1 ;;
        -h|--help)   usage ;;
        *)           fail "unknown argument: $1 (try --help)" ;;
    esac
    shift
done

# ── Detect OS ───────────────────────────────────────────────────────────────
OS="$(uname -s)"
SUDO=""
[ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && SUDO="sudo"

# ── Ensure base tools ───────────────────────────────────────────────────────
step "Base tools"
need_curl=0
command -v curl >/dev/null 2>&1 || need_curl=1
if [ "$need_curl" = 1 ]; then
    case "$OS" in
        Linux)
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                if [ "${ID:-}" = "ubuntu" ] || [ "${ID_LIKE:-}" = "debian" ]; then
                    $SUDO apt-get update -y >/dev/null
                    $SUDO apt-get install -y --no-install-recommends curl ca-certificates
                fi
            fi
            ;;
        Darwin)
            command -v brew >/dev/null 2>&1 || fail "Install Homebrew first: https://brew.sh"
            brew install curl
            ;;
    esac
fi
ok "curl present: $(curl --version | head -n1)"

# ── Node 20 (via existing install, nvm, or a package) ───────────────────────
step "Node.js $NODE_MAJOR"

have_ok_node() {
    command -v node >/dev/null 2>&1 || return 1
    local v
    v="$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')"
    [ "${v:-0}" -ge "$NODE_MAJOR" ]
}

if have_ok_node; then
    ok "node $(node -v) present"
else
    if [ -n "${NVM_DIR:-}" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
        log "using existing nvm at $NVM_DIR"
        # shellcheck disable=SC1091
        . "$NVM_DIR/nvm.sh"
    else
        export NVM_DIR="$HOME/.nvm"
        if [ ! -s "$NVM_DIR/nvm.sh" ]; then
            log "installing nvm (node version manager) into $NVM_DIR"
            curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
        fi
        # shellcheck disable=SC1091
        . "$NVM_DIR/nvm.sh"
    fi
    log "installing node $NODE_MAJOR via nvm"
    nvm install "$NODE_MAJOR" >/dev/null
    nvm alias default "$NODE_MAJOR" >/dev/null
    nvm use default >/dev/null
    have_ok_node || fail "node $NODE_MAJOR not on PATH after install"
    ok "node $(node -v) installed"
fi

ok "npm $(npm -v) ready"

# ── Shell profile (nvm) ─────────────────────────────────────────────────────
if [ -n "${NVM_DIR:-}" ]; then
    case "${SHELL:-/bin/bash}" in
        */zsh)  profile="$HOME/.zshrc" ;;
        */bash) profile="$HOME/.bashrc" ;;
        *)      profile="$HOME/.profile" ;;
    esac
    marker="# >>> kidsrides nvm >>>"
    if [ -f "$profile" ] && ! grep -qF "$marker" "$profile"; then
        {
            printf "\n%s\n" "$marker"
            printf 'export NVM_DIR="%s"\n' "$NVM_DIR"
            printf '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"\n'
            printf "# <<< kidsrides nvm <<<\n"
        } >> "$profile"
        ok "appended nvm exports to $profile"
    fi
fi

# ── Project deps ────────────────────────────────────────────────────────────
if [ "$SKIP_DEPS" = 0 ]; then
    step "Project dependencies"
    if [ ! -f "./package.json" ]; then
        warn "no package.json here — skipping npm install"
    else
        log "npm install"
        npm install --no-audit --no-fund
        ok "dependencies installed ($(ls node_modules | wc -l) packages)"
    fi
fi

# ── Sanity ──────────────────────────────────────────────────────────────────
if [ "$SKIP_TEST" = 0 ] && [ -f "./package.json" ]; then
    step "Sanity check (npm test)"
    if npm test --silent; then
        ok "all tests passed"
    else
        fail "tests failed — investigate"
    fi
fi

# ── Done ────────────────────────────────────────────────────────────────────
step "Done"
ok "install complete"
printf "\nNext steps:\n"
printf "  • Open a new shell (or: source your shell rc) if nvm was installed fresh\n"
printf "  • Dev server:  %snpm run dev%s  (http://localhost:5173)\n" "$BOLD" "$RESET"
printf "  • Tests:       %snpm test%s\n" "$BOLD" "$RESET"
printf "  • Build:       %snpm run build%s  (output → dist/)\n" "$BOLD" "$RESET"
printf "  • Preview:     %snpm run preview%s (prod build on http://localhost:4173)\n" "$BOLD" "$RESET"
printf "\nSee gettingStarted.md for details.\n"
