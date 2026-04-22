#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

MODE="dev"
for arg in "$@"; do
  case "$arg" in
    --prod)     MODE="prod" ;;
    --dev)      MODE="dev" ;;
    --cloud)    MODE="cloud" ;;
    --firebase) MODE="firebase" ;;
    -h|--help)
      cat <<EOF
Usage: $0 [--dev|--prod|--cloud|--firebase]
  --dev       (default) HTTPS Vite dev server on :5173 with HMR
  --prod      build + HTTPS preview of dist/ on :4173 (self-signed cert)
  --cloud     build + Cloudflare quick tunnel — real HTTPS, works on any device/network
  --firebase  build + deploy to Firebase Hosting (idrive-8bcdc.web.app) — stable URL, no auth issues
EOF
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      echo "Usage: $0 [--dev|--prod|--cloud|--firebase]" >&2
      exit 1
      ;;
  esac
done

LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") print $(i+1)}' | head -1)
if [ -z "${LAN_IP:-}" ]; then
  LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

case "$MODE" in
  firebase)
    echo "==> Building production bundle..."
    npm run build
    echo "==> Checking Firebase login..."
    npx --yes firebase-tools login --no-localhost 2>/dev/null || true
    echo "==> Deploying to Firebase Hosting..."
    npx --yes firebase-tools deploy --only hosting
    echo ""
    echo "============================================"
    echo "  Live at: https://idrive-8bcdc.web.app"
    echo "  (URL never changes — no auth domain issues)"
    echo "============================================"
    ;;

  prod)
    echo "==> Building production bundle (includes service worker)..."
    npm run build

    PORT=4173
    URL_HOST="${LAN_IP:-<this-machine-ip>}"
    echo ""
    echo "============================================"
    echo "  PROD preview — open on Android:"
    echo ""
    echo "  https://${URL_HOST}:${PORT}"
    echo ""
    echo "  Accept the self-signed cert warning."
    echo "  Full PWA (SW + manifest) — install prompt available."
    echo "============================================"
    echo ""
    exec env HTTPS=1 npx vite preview --port "$PORT" --host
    ;;

  cloud)
    echo "==> Building production bundle (includes service worker)..."
    npm run build

    LOG_DIR="$(mktemp -d -t idrive-cloud-XXXX)"
    VITE_LOG="$LOG_DIR/vite.log"
    CF_LOG="$LOG_DIR/cloudflared.log"
    VITE_PID=""
    CF_PID=""

    cleanup() {
      echo ""
      echo "==> Stopping tunnel + preview ..."
      if [ -n "$CF_PID" ]; then kill "$CF_PID" 2>/dev/null || true; fi
      if [ -n "$VITE_PID" ]; then kill "$VITE_PID" 2>/dev/null || true; fi
      wait 2>/dev/null || true
    }
    trap cleanup EXIT INT TERM

    echo "==> Starting preview on http://127.0.0.1:4173 (HTTP — cloudflared terminates TLS)"
    npx vite preview --port 4173 --host 127.0.0.1 >"$VITE_LOG" 2>&1 &
    VITE_PID=$!

    printf "==> Waiting for preview "
    READY=0
    for _ in $(seq 1 30); do
      if curl -sfo /dev/null "http://127.0.0.1:4173/"; then
        echo "ready."
        READY=1
        break
      fi
      printf "."
      sleep 0.5
    done
    if [ "$READY" -ne 1 ]; then
      echo ""
      echo "ERROR: vite preview did not come up. Log:" >&2
      cat "$VITE_LOG" >&2
      exit 1
    fi

    echo "==> Starting Cloudflare quick tunnel ..."
    npx --yes cloudflared tunnel --url http://localhost:4173 >"$CF_LOG" 2>&1 &
    CF_PID=$!

    printf "==> Waiting for tunnel URL "
    PUBLIC_URL=""
    for _ in $(seq 1 60); do
      PUBLIC_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" 2>/dev/null | head -1 || true)
      if [ -n "$PUBLIC_URL" ]; then
        echo "ready."
        break
      fi
      printf "."
      sleep 1
    done

    if [ -z "$PUBLIC_URL" ]; then
      echo ""
      echo "ERROR: Cloudflare tunnel URL did not appear. Last lines of log:" >&2
      tail -40 "$CF_LOG" >&2
      exit 1
    fi

    echo ""
    echo "============================================"
    echo "  PUBLIC URL (real HTTPS, trusted cert):"
    echo ""
    echo "    $PUBLIC_URL"
    echo ""
    echo "  On Android Chrome:"
    echo "    1. Open the URL above"
    echo "    2. Wait ~10s for DNS + service worker to register"
    echo "    3. Tap chrome menu (⋮) → \"Install app\""
    echo ""
    echo "  Logs: $LOG_DIR"
    echo "  Live health-check every 5s below. Ctrl+C to stop."
    echo "============================================"
    echo ""

    # Health-check loop: keep script alive and report per-process health
    # until one of them dies or user hits Ctrl+C.
    while true; do
      if ! kill -0 "$VITE_PID" 2>/dev/null; then
        echo ""
        echo "!! vite preview exited. Last 40 lines of log:"
        echo "-------------------------------------------"
        tail -40 "$VITE_LOG"
        echo "-------------------------------------------"
        exit 1
      fi
      if ! kill -0 "$CF_PID" 2>/dev/null; then
        echo ""
        echo "!! cloudflared exited. Last 40 lines of log:"
        echo "-------------------------------------------"
        tail -40 "$CF_LOG"
        echo "-------------------------------------------"
        exit 1
      fi
      if ! curl -sfo /dev/null --max-time 3 "http://127.0.0.1:4173/"; then
        echo "$(date +%H:%M:%S) WARN: local preview not responding on :4173"
      fi
      sleep 5
    done
    ;;

  dev)
    PORT=5173
    URL_HOST="${LAN_IP:-<this-machine-ip>}"
    echo ""
    echo "============================================"
    echo "  DEV server (HMR) — open on Android:"
    echo ""
    echo "  https://${URL_HOST}:${PORT}"
    echo ""
    echo "  Accept the self-signed cert warning."
    echo "  Note: service worker is NOT served in dev."
    echo "  Use --prod for local PWA, --cloud for public HTTPS."
    echo "============================================"
    echo ""
    exec env HTTPS=1 npx vite --port "$PORT" --host
    ;;
esac
